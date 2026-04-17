'use server'

import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '@touracore/db/server'
import { z } from 'zod'

const ADESchema = z.object({
  restaurantId: z.string().uuid(),
  tenantSlug: z.string(),
  entitySlug: z.string(),
})

const InvoiceSchema = z.object({
  restaurantId: z.string().uuid(),
  tenantSlug: z.string(),
  entitySlug: z.string(),
  invoiceNumber: z.string().min(1).max(40),
  invoiceDate: z.string(),
  customerName: z.string().min(1).max(200),
  customerVatNumber: z.string().optional(),
  customerSdiCode: z.string().optional(),
  amountSubtotal: z.number().min(0),
  vatPct: z.number().min(0).max(30),
  description: z.string().optional(),
})

const RetentionSchema = z.object({
  restaurantId: z.string().uuid(),
  tenantSlug: z.string(),
  entitySlug: z.string(),
  category: z.enum(['fiscal', 'reservation', 'guest_pii', 'marketing', 'employment', 'haccp']),
  retentionDays: z.number().int().min(1),
  legalBasis: z.string().min(1),
})

function pathFor(p: { tenantSlug: string; entitySlug: string }) {
  return `/${p.tenantSlug}/dine/${p.entitySlug}/fiscal`
}

export async function triggerADESubmission(input: z.infer<typeof ADESchema>) {
  const parsed = ADESchema.parse(input)
  const admin = await createServiceRoleClient()

  const today = new Date().toISOString().slice(0, 10)

  const { data: receipts } = await admin
    .from('fiscal_receipts')
    .select('amount_total, vat_total')
    .eq('restaurant_id', parsed.restaurantId)
    .eq('fiscal_date', today)

  const total = (receipts ?? []).reduce((s, r) => s + Number(r.amount_total), 0)
  const vat = (receipts ?? []).reduce((s, r) => s + Number(r.vat_total), 0)
  const count = (receipts ?? []).length

  const { data: xmlData } = await admin.rpc('build_ade_daily_xml', {
    p_restaurant_id: parsed.restaurantId,
    p_date: today,
  })

  await admin.from('ade_daily_submissions').upsert(
    {
      restaurant_id: parsed.restaurantId,
      submission_date: today,
      receipts_count: count,
      total_amount: total,
      total_vat: vat,
      xml_payload: xmlData ?? '',
      status: 'submitted',
      attempts: 1,
      submitted_at: new Date().toISOString(),
    },
    { onConflict: 'restaurant_id,submission_date' },
  )

  revalidatePath(pathFor(parsed))
}

export async function createB2BInvoice(input: z.infer<typeof InvoiceSchema>) {
  const parsed = InvoiceSchema.parse(input)
  const admin = await createServiceRoleClient()

  const vatAmount = +(parsed.amountSubtotal * (parsed.vatPct / 100)).toFixed(2)
  const total = +(parsed.amountSubtotal + vatAmount).toFixed(2)

  // XML SDI 1.2.1 placeholder
  const xmlSdi = `<?xml version="1.0" encoding="UTF-8"?>
<p:FatturaElettronica versione="FPR12" xmlns:p="http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2">
  <FatturaElettronicaHeader>
    <DatiTrasmissione>
      <CodiceDestinatario>${parsed.customerSdiCode ?? '0000000'}</CodiceDestinatario>
    </DatiTrasmissione>
    <CessionarioCommittente>
      <DatiAnagrafici>
        <IdFiscaleIVA>${parsed.customerVatNumber ?? ''}</IdFiscaleIVA>
        <Anagrafica><Denominazione>${parsed.customerName}</Denominazione></Anagrafica>
      </DatiAnagrafici>
    </CessionarioCommittente>
  </FatturaElettronicaHeader>
  <FatturaElettronicaBody>
    <DatiGenerali>
      <DatiGeneraliDocumento>
        <Numero>${parsed.invoiceNumber}</Numero>
        <Data>${parsed.invoiceDate}</Data>
        <ImportoTotaleDocumento>${total.toFixed(2)}</ImportoTotaleDocumento>
      </DatiGeneraliDocumento>
    </DatiGenerali>
    <DatiBeniServizi>
      <DettaglioLinee>
        <NumeroLinea>1</NumeroLinea>
        <Descrizione>${parsed.description ?? 'Servizi ristorazione'}</Descrizione>
        <PrezzoUnitario>${parsed.amountSubtotal.toFixed(2)}</PrezzoUnitario>
        <PrezzoTotale>${parsed.amountSubtotal.toFixed(2)}</PrezzoTotale>
        <AliquotaIVA>${parsed.vatPct.toFixed(2)}</AliquotaIVA>
      </DettaglioLinee>
    </DatiBeniServizi>
  </FatturaElettronicaBody>
</p:FatturaElettronica>`

  await admin.from('b2b_invoices').insert({
    restaurant_id: parsed.restaurantId,
    invoice_number: parsed.invoiceNumber,
    invoice_date: parsed.invoiceDate,
    customer_name: parsed.customerName,
    customer_vat_number: parsed.customerVatNumber ?? null,
    customer_sdi_code: parsed.customerSdiCode ?? null,
    amount_subtotal: parsed.amountSubtotal,
    amount_vat: vatAmount,
    amount_total: total,
    vat_pct: parsed.vatPct,
    description: parsed.description ?? null,
    xml_sdi_payload: xmlSdi,
    sdi_status: 'submitted',
    sdi_submitted_at: new Date().toISOString(),
  })

  revalidatePath(pathFor(parsed))
}

export async function savRetentionPolicy(input: z.infer<typeof RetentionSchema>) {
  const parsed = RetentionSchema.parse(input)
  const admin = await createServiceRoleClient()
  await admin.from('gdpr_retention_policy').upsert(
    {
      restaurant_id: parsed.restaurantId,
      category: parsed.category,
      retention_days: parsed.retentionDays,
      legal_basis: parsed.legalBasis,
      active: true,
    },
    { onConflict: 'restaurant_id,category' },
  )
  revalidatePath(pathFor(parsed))
}
