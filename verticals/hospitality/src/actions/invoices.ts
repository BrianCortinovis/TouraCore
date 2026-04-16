'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@touracore/db'
import { getCurrentOrg } from '../queries/auth'
import type {
  InvoiceType,
  PaymentMethod,
  PaymentStatus,
  SdiStatus,
} from '../types/database'
import { logAdminAction } from './compliance'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface InvoiceItemInput {
  description: string
  quantity: number
  unit_price: number
  vat_rate: number
  sort_order?: number
}

export interface CreateInvoiceData {
  entity_id: string
  reservation_id?: string | null
  guest_id?: string | null
  invoice_type?: InvoiceType
  invoice_date: string
  due_date?: string | null
  customer_name: string
  customer_vat?: string | null
  customer_fiscal_code?: string | null
  customer_address?: string | null
  customer_city?: string | null
  customer_province?: string | null
  customer_zip?: string | null
  customer_country?: string
  customer_sdi_code?: string | null
  customer_pec?: string | null
  payment_method?: PaymentMethod | null
  payment_terms?: string | null
  notes?: string | null
  internal_notes?: string | null
  created_by?: string | null
  items: InvoiceItemInput[]
}

export interface PaymentData {
  amount: number
  method: PaymentMethod
  currency?: string
  description?: string | null
  reference_number?: string | null
  notes?: string | null
  created_by?: string | null
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

/**
 * Create an invoice with its line items in a transaction-like flow.
 *
 * 1. Generates an invoice number via the DB function.
 * 2. Computes subtotal, VAT, and total from the items.
 * 3. Inserts the invoice header.
 * 4. Inserts all invoice items.
 */
export async function createInvoice(data: CreateInvoiceData) {
  if (!data.entity_id) throw new Error('entity_id is required')
  if (!data.customer_name) throw new Error('customer_name is required')
  if (!data.invoice_date) throw new Error('invoice_date is required')
  if (!data.items || data.items.length === 0) throw new Error('At least one invoice item is required')

  const supabase = await createServerSupabaseClient()

  // Generate invoice number via DB function
  const { data: invoiceNumber, error: numError } = await supabase.rpc(
    'generate_invoice_number',
    { org_id: data.entity_id }
  )
  if (numError) throw new Error(`Failed to generate invoice number: ${numError.message}`)

  // Compute line item totals
  const computedItems = data.items.map((item, idx) => {
    const lineTotal = item.quantity * item.unit_price
    const vatAmount = lineTotal * (item.vat_rate / 100)
    return {
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      vat_rate: item.vat_rate,
      vat_amount: Math.round(vatAmount * 100) / 100,
      total: Math.round((lineTotal + vatAmount) * 100) / 100,
      sort_order: item.sort_order ?? idx,
    }
  })

  const subtotal = computedItems.reduce(
    (sum, item) => sum + item.quantity * item.unit_price,
    0
  )
  const totalVat = computedItems.reduce((sum, item) => sum + item.vat_amount, 0)
  const total = Math.round((subtotal + totalVat) * 100) / 100

  // Insert invoice header
  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .insert({
      entity_id: data.entity_id,
      reservation_id: data.reservation_id ?? null,
      guest_id: data.guest_id ?? null,
      invoice_type: data.invoice_type ?? 'invoice',
      invoice_number: invoiceNumber as string,
      invoice_date: data.invoice_date,
      due_date: data.due_date ?? null,
      customer_name: data.customer_name,
      customer_vat: data.customer_vat ?? null,
      customer_fiscal_code: data.customer_fiscal_code ?? null,
      customer_address: data.customer_address ?? null,
      customer_city: data.customer_city ?? null,
      customer_province: data.customer_province ?? null,
      customer_zip: data.customer_zip ?? null,
      customer_country: data.customer_country ?? 'IT',
      customer_sdi_code: data.customer_sdi_code ?? null,
      customer_pec: data.customer_pec ?? null,
      subtotal: Math.round(subtotal * 100) / 100,
      total_vat: Math.round(totalVat * 100) / 100,
      total,
      payment_method: data.payment_method ?? null,
      payment_status: 'pending' as PaymentStatus,
      payment_terms: data.payment_terms ?? null,
      sdi_status: 'draft' as SdiStatus,
      notes: data.notes ?? null,
      internal_notes: data.internal_notes ?? null,
      created_by: data.created_by ?? null,
    })
    .select()
    .single()

  if (invoiceError) throw new Error(`Failed to create invoice: ${invoiceError.message}`)

  // Insert invoice items
  const itemsToInsert = computedItems.map((item) => ({
    invoice_id: invoice.id,
    description: item.description,
    quantity: item.quantity,
    unit_price: item.unit_price,
    vat_rate: item.vat_rate,
    vat_amount: item.vat_amount,
    total: item.total,
    sort_order: item.sort_order,
  }))

  const { error: itemsError } = await supabase
    .from('invoice_items')
    .insert(itemsToInsert)

  if (itemsError) {
    // Best-effort cleanup: delete the invoice header if items fail
    await supabase.from('invoices').delete().eq('id', invoice.id)
    throw new Error(`Failed to create invoice items: ${itemsError.message}`)
  }

  logAdminAction({
    organizationId: data.entity_id,
    userId: data.created_by ?? undefined,
    action: 'invoice.create',
    entityType: 'invoice',
    entityId: invoice.id,
    details: { invoice_number: invoice.invoice_number, total },
  }).catch(() => {})

  revalidatePath('/invoices')
  return invoice
}

/**
 * Update the payment status of an invoice (e.g. pending -> paid -> overdue).
 */
export async function updateInvoiceStatus(id: string, status: PaymentStatus) {
  if (!id) throw new Error('Invoice id is required')
  if (!status) throw new Error('status is required')

  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()
  const orgId = property?.id

  let query = supabase
    .from('invoices')
    .update({
      payment_status: status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (orgId) query = query.eq('entity_id', orgId)

  const { data: invoice, error } = await query.select().single()

  if (error) throw new Error(`Failed to update invoice status: ${error.message}`)

  revalidatePath('/invoices')
  return invoice
}

/**
 * Mark an invoice as paid by creating a payment record and updating the invoice.
 *
 * 1. Fetches the invoice to get context (reservation_id, guest_id, entity_id).
 * 2. Creates a payment record.
 * 3. Updates the invoice payment_status to 'paid' and sets the payment_method.
 */
export async function markAsPaid(invoiceId: string, paymentData: PaymentData) {
  if (!invoiceId) throw new Error('Invoice id is required')
  if (!paymentData.amount || paymentData.amount <= 0) throw new Error('Payment amount must be positive')
  if (!paymentData.method) throw new Error('Payment method is required')

  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()
  const orgId = property?.id

  // Fetch the invoice for context
  let fetchQuery = supabase
    .from('invoices')
    .select('id, entity_id, reservation_id, guest_id')
    .eq('id', invoiceId)

  if (orgId) fetchQuery = fetchQuery.eq('entity_id', orgId)

  const { data: invoice, error: fetchError } = await fetchQuery.single()

  if (fetchError || !invoice) {
    throw new Error(`Invoice not found: ${fetchError?.message ?? 'unknown error'}`)
  }

  // Create payment record
  const { error: paymentError } = await supabase
    .from('payments')
    .insert({
      entity_id: invoice.entity_id,
      invoice_id: invoiceId,
      reservation_id: invoice.reservation_id ?? null,
      guest_id: invoice.guest_id ?? null,
      amount: paymentData.amount,
      currency: paymentData.currency ?? 'EUR',
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: paymentData.method,
      description: paymentData.description ?? null,
      reference_number: paymentData.reference_number ?? null,
      notes: paymentData.notes ?? null,
      is_refund: false,
      created_by: paymentData.created_by ?? null,
    })

  if (paymentError) throw new Error(`Failed to create payment: ${paymentError.message}`)

  // Update invoice status
  let updateQuery = supabase
    .from('invoices')
    .update({
      payment_status: 'paid' as PaymentStatus,
      payment_method: paymentData.method,
      updated_at: new Date().toISOString(),
    })
    .eq('id', invoiceId)

  if (orgId) updateQuery = updateQuery.eq('entity_id', orgId)

  const { data: updatedInvoice, error: updateError } = await updateQuery.select().single()

  if (updateError) throw new Error(`Failed to update invoice after payment: ${updateError.message}`)

  logAdminAction({
    organizationId: invoice.entity_id,
    action: 'invoice.paid',
    entityType: 'invoice',
    entityId: invoiceId,
    details: { amount: paymentData.amount, method: paymentData.method },
  }).catch(() => {})

  revalidatePath('/invoices')
  return updatedInvoice
}

/**
 * Generate FatturaPA XML and update SDI status.
 *
 * Genera il file XML nel formato FatturaPA 1.2.2 richiesto dall'Agenzia delle Entrate.
 * Se SDI_ENDPOINT e' configurato, invia il file. Altrimenti lo salva per invio manuale.
 *
 * Flusso: draft -> ready -> sent -> delivered/accepted/rejected
 */
export async function sendToSdi(id: string) {
  if (!id) throw new Error('Invoice id is required')

  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()
  const orgId = property?.id

  // Fetch completa con items e organizzazione
  let sdiQuery = supabase
    .from('invoices')
    .select(
      '*, entity:entities(name), accommodation:accommodations(legal_name, vat_number, fiscal_code, address, city, province, zip, phone, email, sdi_code, pec)'
    )
    .eq('id', id)

  if (orgId) sdiQuery = sdiQuery.eq('entity_id', orgId)

  const { data: invoice, error: fetchError } = await sdiQuery.single()

  if (fetchError || !invoice) throw new Error(`Invoice not found: ${fetchError?.message ?? 'unknown'}`)

  const { data: items } = await supabase
    .from('invoice_items')
    .select('*')
    .eq('invoice_id', id)
    .order('sort_order')

  const entity = invoice.entity as Record<string, string | null> | null
  const accommodation = invoice.accommodation as Record<string, string | null> | null

  // Genera XML FatturaPA semplificato
  const progressivo = invoice.invoice_number?.replace(/[^0-9]/g, '') ?? '00001'
  const xml = generateFatturaPAXml({
    progressivoInvio: progressivo,
    cedente: {
      denominazione: entity?.name ?? accommodation?.legal_name ?? '',
      partitaIva: accommodation?.vat_number ?? '',
      codiceFiscale: accommodation?.fiscal_code ?? '',
      indirizzo: accommodation?.address ?? '',
      cap: accommodation?.zip ?? '',
      comune: accommodation?.city ?? '',
      provincia: accommodation?.province ?? '',
    },
    cessionario: {
      denominazione: invoice.customer_name ?? '',
      partitaIva: invoice.customer_vat ?? '',
      codiceFiscale: invoice.customer_fiscal_code ?? '',
      codiceDestinatario: invoice.customer_sdi_code ?? '0000000',
      pec: invoice.customer_pec ?? '',
      indirizzo: invoice.customer_address ?? '',
      cap: invoice.customer_zip ?? '',
      comune: invoice.customer_city ?? '',
      provincia: invoice.customer_province ?? '',
    },
    documento: {
      tipo: invoice.invoice_type === 'credit_note' ? 'TD04' : 'TD01',
      numero: invoice.invoice_number ?? '',
      data: invoice.invoice_date ?? new Date().toISOString().slice(0, 10),
    },
    linee: (items ?? []).map((item: any, idx: number) => ({
      numero: idx + 1,
      descrizione: item.description ?? '',
      quantita: item.quantity ?? 1,
      prezzoUnitario: item.unit_price ?? 0,
      prezzoTotale: (item.quantity ?? 1) * (item.unit_price ?? 0),
      aliquotaIva: item.vat_rate ?? 0,
    })),
    totaleImponibile: invoice.subtotal ?? 0,
    totaleImposta: invoice.total_vat ?? 0,
    totaleDocumento: invoice.total ?? 0,
  })

  // Salva XML e aggiorna status
  const { data: updated, error: updateError } = await supabase
    .from('invoices')
    .update({
      sdi_status: 'ready' as SdiStatus,
      xml_content: xml,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (updateError) throw new Error(`Failed to update invoice: ${updateError.message}`)

  // Se SDI_ENDPOINT e' configurato, invia direttamente
  const sdiEndpoint = process.env.SDI_ENDPOINT
  if (sdiEndpoint) {
    try {
      const response = await fetch(sdiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/xml' },
        body: xml,
      })

      if (response.ok) {
        await supabase
          .from('invoices')
          .update({ sdi_status: 'sent' as SdiStatus, updated_at: new Date().toISOString() })
          .eq('id', id)
      } else {
        const errorBody = await response.text()
        console.error('[SDI] Errore invio:', errorBody)
        await supabase
          .from('invoices')
          .update({ sdi_status: 'error' as SdiStatus, updated_at: new Date().toISOString() })
          .eq('id', id)
      }
    } catch (sdiError) {
      console.error('[SDI] Errore connessione:', sdiError)
    }
  }

  logAdminAction({
    organizationId: invoice.entity_id,
    action: 'invoice.send_sdi',
    entityType: 'invoice',
    entityId: id,
    details: { sdi_status: sdiEndpoint ? 'sent' : 'ready', has_xml: true },
  }).catch(() => {})

  revalidatePath('/invoices')
  return updated
}

// ---------------------------------------------------------------------------
// Generazione XML FatturaPA
// ---------------------------------------------------------------------------

function generateFatturaPAXml(data: {
  progressivoInvio: string
  cedente: { denominazione: string; partitaIva: string; codiceFiscale: string; indirizzo: string; cap: string; comune: string; provincia: string }
  cessionario: { denominazione: string; partitaIva: string; codiceFiscale: string; codiceDestinatario: string; pec: string; indirizzo: string; cap: string; comune: string; provincia: string }
  documento: { tipo: string; numero: string; data: string }
  linee: Array<{ numero: number; descrizione: string; quantita: number; prezzoUnitario: number; prezzoTotale: number; aliquotaIva: number }>
  totaleImponibile: number
  totaleImposta: number
  totaleDocumento: number
}): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const fmt = (n: number) => n.toFixed(2)

  const linee = data.linee.map((l) => `
        <DettaglioLinee>
          <NumeroLinea>${l.numero}</NumeroLinea>
          <Descrizione>${esc(l.descrizione)}</Descrizione>
          <Quantita>${fmt(l.quantita)}</Quantita>
          <PrezzoUnitario>${fmt(l.prezzoUnitario)}</PrezzoUnitario>
          <PrezzoTotale>${fmt(l.prezzoTotale)}</PrezzoTotale>
          <AliquotaIVA>${fmt(l.aliquotaIva)}</AliquotaIVA>
        </DettaglioLinee>`).join('')

  // Raggruppa riepilogo IVA per aliquota
  const ivaMap: Record<number, { imponibile: number; imposta: number }> = {}
  for (const l of data.linee) {
    if (!ivaMap[l.aliquotaIva]) ivaMap[l.aliquotaIva] = { imponibile: 0, imposta: 0 }
    ivaMap[l.aliquotaIva]!.imponibile += l.prezzoTotale
    ivaMap[l.aliquotaIva]!.imposta += l.prezzoTotale * l.aliquotaIva / 100
  }

  const riepilogo = Object.entries(ivaMap).map(([aliquota, vals]) => `
        <DatiRiepilogo>
          <AliquotaIVA>${fmt(Number(aliquota))}</AliquotaIVA>
          <ImponibileImporto>${fmt(vals.imponibile)}</ImponibileImporto>
          <Imposta>${fmt(vals.imposta)}</Imposta>
        </DatiRiepilogo>`).join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<p:FatturaElettronica versione="FPR12" xmlns:ds="http://www.w3.org/2000/09/xmldsig#" xmlns:p="http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2 http://www.fatturapa.gov.it/export/fatturazione/sdi/fatturapa/v1.2.2/Schema_del_file_xml_FatturaPA_v1.2.2.xsd">
  <FatturaElettronicaHeader>
    <DatiTrasmissione>
      <IdTrasmittente>
        <IdPaese>IT</IdPaese>
        <IdCodice>${esc(data.cedente.partitaIva || data.cedente.codiceFiscale)}</IdCodice>
      </IdTrasmittente>
      <ProgressivoInvio>${esc(data.progressivoInvio)}</ProgressivoInvio>
      <FormatoTrasmissione>FPR12</FormatoTrasmissione>
      <CodiceDestinatario>${esc(data.cessionario.codiceDestinatario)}</CodiceDestinatario>
      ${data.cessionario.pec ? `<PECDestinatario>${esc(data.cessionario.pec)}</PECDestinatario>` : ''}
    </DatiTrasmissione>
    <CedentePrestatore>
      <DatiAnagrafici>
        <IdFiscaleIVA>
          <IdPaese>IT</IdPaese>
          <IdCodice>${esc(data.cedente.partitaIva)}</IdCodice>
        </IdFiscaleIVA>
        ${data.cedente.codiceFiscale ? `<CodiceFiscale>${esc(data.cedente.codiceFiscale)}</CodiceFiscale>` : ''}
        <Anagrafica>
          <Denominazione>${esc(data.cedente.denominazione)}</Denominazione>
        </Anagrafica>
        <RegimeFiscale>RF01</RegimeFiscale>
      </DatiAnagrafici>
      <Sede>
        <Indirizzo>${esc(data.cedente.indirizzo || 'N/D')}</Indirizzo>
        <CAP>${esc(data.cedente.cap || '00000')}</CAP>
        <Comune>${esc(data.cedente.comune || 'N/D')}</Comune>
        ${data.cedente.provincia ? `<Provincia>${esc(data.cedente.provincia)}</Provincia>` : ''}
        <Nazione>IT</Nazione>
      </Sede>
    </CedentePrestatore>
    <CessionarioCommittente>
      <DatiAnagrafici>
        ${data.cessionario.partitaIva ? `<IdFiscaleIVA><IdPaese>IT</IdPaese><IdCodice>${esc(data.cessionario.partitaIva)}</IdCodice></IdFiscaleIVA>` : ''}
        ${data.cessionario.codiceFiscale ? `<CodiceFiscale>${esc(data.cessionario.codiceFiscale)}</CodiceFiscale>` : ''}
        <Anagrafica>
          <Denominazione>${esc(data.cessionario.denominazione)}</Denominazione>
        </Anagrafica>
      </DatiAnagrafici>
      <Sede>
        <Indirizzo>${esc(data.cessionario.indirizzo || 'N/D')}</Indirizzo>
        <CAP>${esc(data.cessionario.cap || '00000')}</CAP>
        <Comune>${esc(data.cessionario.comune || 'N/D')}</Comune>
        ${data.cessionario.provincia ? `<Provincia>${esc(data.cessionario.provincia)}</Provincia>` : ''}
        <Nazione>IT</Nazione>
      </Sede>
    </CessionarioCommittente>
  </FatturaElettronicaHeader>
  <FatturaElettronicaBody>
    <DatiGenerali>
      <DatiGeneraliDocumento>
        <TipoDocumento>${esc(data.documento.tipo)}</TipoDocumento>
        <Divisa>EUR</Divisa>
        <Data>${esc(data.documento.data)}</Data>
        <Numero>${esc(data.documento.numero)}</Numero>
        <ImportoTotaleDocumento>${fmt(data.totaleDocumento)}</ImportoTotaleDocumento>
      </DatiGeneraliDocumento>
    </DatiGenerali>
    <DatiBeniServizi>${linee}${riepilogo}
    </DatiBeniServizi>
  </FatturaElettronicaBody>
</p:FatturaElettronica>`
}
