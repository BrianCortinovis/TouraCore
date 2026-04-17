import { createServerSupabaseClient } from '@touracore/db/server'
import { DocumentsView } from './documents-view'

interface Props {
  params: Promise<{ tenantSlug: string }>
  searchParams: Promise<{ type?: string; vertical?: string; status?: string }>
}

export default async function DocumentsPage({ params, searchParams }: Props) {
  const { tenantSlug } = await params
  const { type, vertical, status } = await searchParams
  const supabase = await createServerSupabaseClient()

  const { data: tenant } = await supabase.from('tenants').select('id, name').eq('slug', tenantSlug).single()
  if (!tenant) return null

  let query = supabase
    .from('documents')
    .select(`
      id, document_type, vertical, document_number, document_date,
      customer_name, customer_vat_number,
      amount_subtotal, amount_vat, amount_total,
      payment_status, paid_amount,
      sdi_status, sdi_submitted_at,
      rt_status, lottery_code,
      entity_id, entities(name, slug, kind),
      created_at
    `)
    .eq('tenant_id', tenant.id)
    .order('document_date', { ascending: false })
    .limit(200)

  if (type) query = query.eq('document_type', type)
  if (vertical) query = query.eq('vertical', vertical)
  if (status) query = query.eq('sdi_status', status)

  const { data: docs } = await query

  const { data: entities } = await supabase
    .from('entities')
    .select('id, name, slug, kind')
    .eq('tenant_id', tenant.id)
    .eq('is_active', true)

  // Stats
  const { data: allDocs } = await supabase
    .from('documents')
    .select('amount_total, payment_status, sdi_status, document_type, vertical')
    .eq('tenant_id', tenant.id)

  const stats = {
    total: (allDocs ?? []).length,
    revenue: (allDocs ?? []).reduce((s, d) => s + Number(d.amount_total), 0),
    unpaid: (allDocs ?? []).filter((d) => d.payment_status === 'pending').reduce((s, d) => s + Number(d.amount_total), 0),
    sdiDraft: (allDocs ?? []).filter((d) => d.sdi_status === 'draft').length,
    byVertical: Array.from(
      (allDocs ?? []).reduce((map, d) => {
        map.set(d.vertical as string, (map.get(d.vertical as string) ?? 0) + Number(d.amount_total))
        return map
      }, new Map<string, number>()).entries(),
    ),
  }

  return (
    <div className="space-y-4 p-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Documenti fiscali</h1>
        <p className="text-sm text-gray-500">Fatture · Scontrini · Corrispettivi · Note credito · cross-vertical</p>
      </header>
      <DocumentsView
        tenantSlug={tenantSlug}
        currentFilters={{ type: type ?? null, vertical: vertical ?? null, status: status ?? null }}
        stats={stats}
        entities={(entities ?? []).map((e) => ({
          id: e.id as string,
          name: e.name as string,
          slug: e.slug as string,
          kind: e.kind as string,
        }))}
        documents={(docs ?? []).map((d) => {
          const ent = Array.isArray(d.entities) ? d.entities[0] : d.entities
          return {
            id: d.id as string,
            documentType: d.document_type as string,
            vertical: d.vertical as string,
            documentNumber: d.document_number as string,
            documentDate: d.document_date as string,
            customerName: d.customer_name as string | null,
            customerVatNumber: d.customer_vat_number as string | null,
            amountTotal: Number(d.amount_total),
            paymentStatus: d.payment_status as string,
            paidAmount: Number(d.paid_amount),
            sdiStatus: d.sdi_status as string | null,
            sdiSubmittedAt: d.sdi_submitted_at as string | null,
            rtStatus: d.rt_status as string | null,
            lotteryCode: d.lottery_code as string | null,
            entityId: d.entity_id as string,
            entityName: (ent as { name?: string } | null)?.name ?? null,
            entityKind: (ent as { kind?: string } | null)?.kind ?? null,
            createdAt: d.created_at as string,
          }
        })}
      />
    </div>
  )
}
