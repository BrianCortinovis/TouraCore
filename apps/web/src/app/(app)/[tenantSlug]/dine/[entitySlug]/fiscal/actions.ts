'use server'

import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '@touracore/db/server'
import { z } from 'zod'
import { assertUserOwnsRestaurant } from '@/lib/restaurant-guard'
import { buildSDIXml, buildSDIFilename } from '@/lib/sdi-xml'
import { buildADECorrispettiviXml, submitADECorrispettivi, issueRTReceipt, voidRTReceipt } from '@/lib/rt-middleware'
import { decryptConfig } from '@/lib/integration-crypto'

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
  await assertUserOwnsRestaurant(parsed.restaurantId)
  const admin = await createServiceRoleClient()

  const today = new Date().toISOString().slice(0, 10)

  // Carica receipts dettagliate (no più solo totali)
  const { data: receipts } = await admin
    .from('fiscal_receipts')
    .select('id, receipt_number, fiscal_date, amount_total, vat_total, lottery_code, rt_serial')
    .eq('restaurant_id', parsed.restaurantId)
    .eq('fiscal_date', today)
    .eq('rt_status', 'printed')

  if (!receipts || receipts.length === 0) {
    throw new Error('Nessuno scontrino RT stampato oggi da inviare ad ADE')
  }

  const total = receipts.reduce((s, r) => s + Number(r.amount_total), 0)
  const vat = receipts.reduce((s, r) => s + Number(r.vat_total), 0)

  // Carica restaurant info fiscale
  const { data: rest } = await admin
    .from('restaurants')
    .select('tenant_id, settings')
    .eq('id', parsed.restaurantId)
    .single()
  if (!rest) throw new Error('Restaurant not found')

  const settings = (rest.settings as Record<string, unknown>) ?? {}
  const vatNumber = (settings.vat_number as string) ?? ''
  const fiscalCode = (settings.fiscal_code as string) ?? ''
  const rtSerial = (settings.rt_serial as string) ?? receipts[0]?.rt_serial ?? 'UNKNOWN'

  if (!vatNumber) {
    throw new Error('Partita IVA mancante nelle impostazioni ristorante')
  }

  // Build XML conforme schema ADE v1.0
  const xmlPayload = buildADECorrispettiviXml({
    restaurantVatNumber: vatNumber,
    restaurantFiscalCode: fiscalCode,
    submissionDate: today,
    rtSerial,
    receipts: receipts.map((r) => ({
      receiptNumber: r.receipt_number as string,
      receiptDate: r.fiscal_date as string,
      amountTotal: Number(r.amount_total),
      vatTotal: Number(r.vat_total),
      lotteryCode: r.lottery_code as string | undefined,
    })),
  })

  // Submit ad ADE endpoint (env: ADE_CORRISPETTIVI_ENDPOINT)
  const adeEndpoint = process.env.ADE_CORRISPETTIVI_ENDPOINT ?? ''
  let submissionResult: { ok: boolean; protocolNumber?: string; error?: string } = { ok: false }
  if (adeEndpoint) {
    submissionResult = await submitADECorrispettivi(adeEndpoint, xmlPayload)
  } else {
    // Sandbox mode: solo store XML
    submissionResult = { ok: true, protocolNumber: `SANDBOX-${Date.now()}` }
  }

  await admin.from('ade_daily_submissions').upsert(
    {
      restaurant_id: parsed.restaurantId,
      submission_date: today,
      receipts_count: receipts.length,
      total_amount: total,
      total_vat: vat,
      xml_payload: xmlPayload,
      status: submissionResult.ok ? 'submitted' : 'retry',
      attempts: 1,
      submitted_at: submissionResult.ok ? new Date().toISOString() : null,
      ade_response: submissionResult.protocolNumber ?? submissionResult.error ?? null,
    },
    { onConflict: 'restaurant_id,submission_date' },
  )

  revalidatePath(pathFor(parsed))
  return { ok: submissionResult.ok, error: submissionResult.error, protocolNumber: submissionResult.protocolNumber }
}

/**
 * Issue RT receipt per chiusura ordine: chiama middleware HTTP che parla con printer fisica.
 * Crea entry in fiscal_receipts e tenta print via middleware.
 */
export async function issueRTReceiptForOrder(input: {
  restaurantId: string
  tenantSlug: string
  entitySlug: string
  orderId: string
  lotteryCode?: string
}): Promise<{ ok: boolean; receiptNumber?: string; error?: string }> {
  await assertUserOwnsRestaurant(input.restaurantId)
  const admin = await createServiceRoleClient()

  const { data: order } = await admin
    .from('restaurant_orders')
    .select('id, total, vat_total, payment_method, opened_at')
    .eq('id', input.orderId)
    .single()

  if (!order) return { ok: false, error: 'Order not found' }

  // Carica RT integration config per ottenere middleware URL
  const { data: integration } = await admin
    .from('restaurant_integrations')
    .select('config_encrypted, config_meta')
    .eq('restaurant_id', input.restaurantId)
    .eq('provider', 'rt_fiscal_it')
    .eq('is_active', true)
    .maybeSingle()

  let middlewareUrl = ''
  let rtSerial = ''
  if (integration?.config_encrypted && integration?.config_meta) {
    try {
      const meta = integration.config_meta as { iv?: string }
      const decrypted = decryptConfig(integration.config_encrypted as string, meta.iv ?? '')
      const config = JSON.parse(decrypted) as { middlewareUrl?: string; fiscalSerial?: string }
      middlewareUrl = config.middlewareUrl ?? ''
      rtSerial = config.fiscalSerial ?? ''
    } catch {
      // Decryption fail
    }
  }

  // Crea fiscal_receipt entry pending
  const { data: receipt, error: insertErr } = await admin
    .from('fiscal_receipts')
    .insert({
      restaurant_id: input.restaurantId,
      order_id: input.orderId,
      fiscal_date: new Date().toISOString().slice(0, 10),
      amount_total: order.total,
      vat_total: order.vat_total,
      lottery_code: input.lotteryCode ?? null,
      rt_status: 'pending',
      rt_serial: rtSerial || null,
    })
    .select('id, receipt_number')
    .single()

  if (insertErr || !receipt) {
    return { ok: false, error: insertErr?.message ?? 'Failed to create receipt' }
  }

  // Submit a RT middleware
  if (middlewareUrl) {
    const result = await issueRTReceipt(middlewareUrl, {
      restaurantId: input.restaurantId,
      orderId: input.orderId,
      amountTotal: Number(order.total),
      vatBreakdown: [{ vatPct: 10, imponibile: Number(order.total) - Number(order.vat_total), imposta: Number(order.vat_total) }],
      paymentMethod: ((order.payment_method as string) ?? 'card') as 'cash' | 'card' | 'mixed',
      lotteryCode: input.lotteryCode,
    })

    await admin
      .from('fiscal_receipts')
      .update({
        rt_status: result.ok ? 'printed' : 'failed',
        receipt_number: result.receiptNumber ?? null,
        rt_serial: result.rtSerial ?? rtSerial,
        rt_response: result.rawResponse ?? result.error ?? null,
        rt_payload: JSON.stringify({ orderId: input.orderId, total: order.total }),
      })
      .eq('id', receipt.id)

    if (!result.ok) {
      return { ok: false, error: result.error }
    }

    return { ok: true, receiptNumber: result.receiptNumber }
  }

  // No middleware = sandbox mode, mark printed
  await admin
    .from('fiscal_receipts')
    .update({
      rt_status: 'printed',
      receipt_number: `SANDBOX-${receipt.id.slice(0, 8)}`,
    })
    .eq('id', receipt.id)

  revalidatePath(pathFor(input))
  return { ok: true, receiptNumber: `SANDBOX-${receipt.id.slice(0, 8)}` }
}

export async function createB2BInvoice(input: z.infer<typeof InvoiceSchema>) {
  const parsed = InvoiceSchema.parse(input)
  await assertUserOwnsRestaurant(parsed.restaurantId)
  const admin = await createServiceRoleClient()

  const vatAmount = +(parsed.amountSubtotal * (parsed.vatPct / 100)).toFixed(2)
  const total = +(parsed.amountSubtotal + vatAmount).toFixed(2)

  // Carica restaurant fiscal info per cedente
  const { data: rest } = await admin
    .from('restaurants')
    .select('settings, tenant_id')
    .eq('id', parsed.restaurantId)
    .single()
  const settings = (rest?.settings as Record<string, unknown>) ?? {}

  // Genera progressivo invio (incrementale per anno)
  const year = new Date(parsed.invoiceDate).getFullYear()
  const { count } = await admin
    .from('b2b_invoices')
    .select('*', { count: 'exact', head: true })
    .eq('restaurant_id', parsed.restaurantId)
    .gte('invoice_date', `${year}-01-01`)
  const progressivoInvio = String((count ?? 0) + 1).padStart(5, '0')

  // XML SDI conforme schema 1.2.1 Agenzia Entrate
  const xmlSdi = buildSDIXml(
    {
      cedenteVatNumber: (settings.vat_number as string) ?? 'IT00000000000',
      cedenteFiscalCode: (settings.fiscal_code as string) ?? undefined,
      cedenteName: (settings.legal_name as string) ?? 'Ristorante',
      cedenteRegime: (settings.fiscal_regime as 'RF01') ?? 'RF01',
      cedenteAddress: (settings.address as string) ?? '',
      cedenteCity: (settings.city as string) ?? '',
      cedenteZip: (settings.zip as string) ?? '00000',
      cedenteProvince: (settings.province as string) ?? '',
      customerVatNumber: parsed.customerVatNumber,
      customerName: parsed.customerName,
      customerCountry: 'IT',
      customerSdiCode: parsed.customerSdiCode,
      invoiceNumber: parsed.invoiceNumber,
      invoiceDate: parsed.invoiceDate,
      invoiceType: 'TD01',
      lines: [
        {
          number: 1,
          description: parsed.description ?? 'Servizi ristorazione',
          qty: 1,
          unitPrice: parsed.amountSubtotal,
          vatPct: parsed.vatPct,
        },
      ],
    },
    progressivoInvio,
  )

  const filename = buildSDIFilename(
    (settings.vat_number as string) ?? '00000000000',
    progressivoInvio,
  )

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
    sdi_status: 'draft', // submitted only after manual SDI/PEC submission
    sdi_submitted_at: null,
  })

  // Filename SDI ready (download via separate action)
  void filename

  revalidatePath(pathFor(parsed))
}

export async function savRetentionPolicy(input: z.infer<typeof RetentionSchema>) {
  const parsed = RetentionSchema.parse(input)
  await assertUserOwnsRestaurant(parsed.restaurantId)
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

export async function voidRTReceiptAction(input: {
  restaurantId: string
  tenantSlug: string
  entitySlug: string
  receiptId: string
}): Promise<{ ok: boolean; error?: string }> {
  await assertUserOwnsRestaurant(input.restaurantId)
  const admin = await createServiceRoleClient()

  const { data: receipt } = await admin
    .from('fiscal_receipts')
    .select('id, receipt_number, rt_serial, rt_status')
    .eq('id', input.receiptId)
    .eq('restaurant_id', input.restaurantId)
    .single()

  if (!receipt) return { ok: false, error: 'Scontrino non trovato' }
  if (receipt.rt_status === 'voided') return { ok: false, error: 'Scontrino già annullato' }
  if (receipt.rt_status !== 'printed') return { ok: false, error: 'Solo scontrini stampati possono essere annullati' }
  if (!receipt.receipt_number || !receipt.rt_serial) return { ok: false, error: 'Dati RT mancanti' }

  const { data: integration } = await admin
    .from('restaurant_integrations')
    .select('config_encrypted, config_meta')
    .eq('restaurant_id', input.restaurantId)
    .eq('provider', 'rt_fiscal_it')
    .eq('is_active', true)
    .maybeSingle()

  let middlewareUrl = ''
  if (integration?.config_encrypted && integration?.config_meta) {
    try {
      const meta = integration.config_meta as { iv?: string }
      const decrypted = decryptConfig(integration.config_encrypted as string, meta.iv ?? '')
      const config = JSON.parse(decrypted) as { middlewareUrl?: string }
      middlewareUrl = config.middlewareUrl ?? ''
    } catch {
      // ignore
    }
  }

  if (!middlewareUrl) {
    await admin
      .from('fiscal_receipts')
      .update({ rt_status: 'voided', rt_response: 'sandbox void' })
      .eq('id', input.receiptId)
    revalidatePath(pathFor(input))
    return { ok: true }
  }

  const result = await voidRTReceipt(middlewareUrl, receipt.receipt_number as string, receipt.rt_serial as string)
  await admin
    .from('fiscal_receipts')
    .update({
      rt_status: result.ok ? 'voided' : 'failed',
      rt_response: result.error ?? 'voided',
    })
    .eq('id', input.receiptId)

  if (!result.ok) return { ok: false, error: result.error }

  revalidatePath(pathFor(input))
  return { ok: true }
}
