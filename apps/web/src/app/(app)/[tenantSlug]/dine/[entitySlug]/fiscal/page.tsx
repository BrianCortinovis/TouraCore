import { createServerSupabaseClient } from '@touracore/db/server'
import { ensureRestaurantRecord } from '../settings/actions'
import { FiscalView } from './fiscal-view'

interface Props {
  params: Promise<{ tenantSlug: string; entitySlug: string }>
}

export default async function FiscalPage({ params }: Props) {
  const { tenantSlug, entitySlug } = await params
  const supabase = await createServerSupabaseClient()

  const { data: entity } = await supabase
    .from('entities')
    .select('id, name, tenant_id')
    .eq('slug', entitySlug)
    .single()
  if (!entity) return null

  await ensureRestaurantRecord(entity.id as string, entity.tenant_id as string)

  const since = new Date()
  since.setDate(since.getDate() - 60)

  const [{ data: receipts }, { data: ade }, { data: invoices }, { data: retentionPolicies }] = await Promise.all([
    supabase
      .from('fiscal_receipts')
      .select('id, receipt_number, fiscal_date, amount_total, vat_total, lottery_code, ade_submission_status, rt_status')
      .eq('restaurant_id', entity.id)
      .gte('fiscal_date', since.toISOString().slice(0, 10))
      .order('fiscal_date', { ascending: false })
      .limit(100),
    supabase
      .from('ade_daily_submissions')
      .select('id, submission_date, receipts_count, total_amount, total_vat, status, attempts, submitted_at, accepted_at')
      .eq('restaurant_id', entity.id)
      .order('submission_date', { ascending: false })
      .limit(60),
    supabase
      .from('b2b_invoices')
      .select('id, invoice_number, invoice_date, customer_name, amount_total, sdi_status')
      .eq('restaurant_id', entity.id)
      .order('invoice_date', { ascending: false })
      .limit(50),
    supabase
      .from('gdpr_retention_policy')
      .select('id, category, retention_days, legal_basis, active')
      .eq('restaurant_id', entity.id)
      .order('category'),
  ])

  return (
    <div className="space-y-4 p-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Fiscale & Compliance</h1>
        <p className="text-sm text-gray-500">Corrispettivi ADE · Lotteria · Fatture B2B SDI · GDPR retention</p>
      </header>
      <FiscalView
        tenantSlug={tenantSlug}
        entitySlug={entitySlug}
        restaurantId={entity.id as string}
        receipts={(receipts ?? []).map((r) => ({
          id: r.id as string,
          receiptNumber: r.receipt_number as string | null,
          fiscalDate: r.fiscal_date as string,
          amountTotal: Number(r.amount_total),
          vatTotal: Number(r.vat_total),
          lotteryCode: r.lottery_code as string | null,
          adeStatus: r.ade_submission_status as string,
          rtStatus: (r.rt_status as string) ?? 'pending',
        }))}
        adeSubmissions={(ade ?? []).map((s) => ({
          id: s.id as string,
          submissionDate: s.submission_date as string,
          receiptsCount: s.receipts_count as number,
          totalAmount: Number(s.total_amount),
          totalVat: Number(s.total_vat),
          status: s.status as string,
          attempts: s.attempts as number,
          submittedAt: s.submitted_at as string | null,
          acceptedAt: s.accepted_at as string | null,
        }))}
        invoices={(invoices ?? []).map((i) => ({
          id: i.id as string,
          invoiceNumber: i.invoice_number as string,
          invoiceDate: i.invoice_date as string,
          customerName: i.customer_name as string,
          amountTotal: Number(i.amount_total),
          sdiStatus: i.sdi_status as string,
        }))}
        retentionPolicies={(retentionPolicies ?? []).map((p) => ({
          id: p.id as string,
          category: p.category as string,
          retentionDays: p.retention_days as number,
          legalBasis: p.legal_basis as string,
          active: p.active as boolean,
        }))}
      />
    </div>
  )
}
