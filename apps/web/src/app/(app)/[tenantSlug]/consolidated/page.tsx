import { createServerSupabaseClient } from '@touracore/db/server'
import { ConsolidatedDashboard } from './consolidated-dashboard'

interface Props {
  params: Promise<{ tenantSlug: string }>
  searchParams: Promise<{ from?: string; to?: string }>
}

export default async function TenantConsolidatedPage({ params, searchParams }: Props) {
  const { tenantSlug } = await params
  const { from, to } = await searchParams
  const supabase = await createServerSupabaseClient()

  const { data: tenant } = await supabase.from('tenants').select('id, name').eq('slug', tenantSlug).single()
  if (!tenant) return null

  const today = new Date()
  const defaultFrom = new Date(today)
  defaultFrom.setDate(defaultFrom.getDate() - 30)
  const fromDate = from ?? defaultFrom.toISOString().slice(0, 10)
  const toDate = to ?? today.toISOString().slice(0, 10)

  const [{ data: kpiDaily }, { data: byEntity }, { data: docsRevenue }] = await Promise.all([
    supabase
      .from('v_tenant_consolidated_kpi')
      .select('service_date, revenue_hospitality, revenue_restaurant, revenue_total, bookings_hospitality, orders_restaurant, entities_active')
      .eq('tenant_id', tenant.id)
      .gte('service_date', fromDate)
      .lte('service_date', toDate)
      .order('service_date'),
    supabase
      .from('v_revenue_unified')
      .select('entity_id, vertical, revenue, transactions_count')
      .eq('tenant_id', tenant.id)
      .gte('service_date', fromDate)
      .lte('service_date', toDate),
    supabase
      .from('v_documents_revenue_summary')
      .select('vertical, document_type, month, documents_count, total_revenue, paid_amount, unpaid_amount')
      .eq('tenant_id', tenant.id)
      .order('month', { ascending: false })
      .limit(50),
  ])

  // Aggregate per entity
  const entityIds = Array.from(new Set((byEntity ?? []).map((r) => r.entity_id as string)))
  const { data: entities } = await supabase
    .from('entities')
    .select('id, name, kind')
    .in('id', entityIds)

  const entityMap = new Map((entities ?? []).map((e) => [e.id as string, { name: e.name as string, kind: e.kind as string }]))

  const byEntityAggregated = new Map<string, { name: string; kind: string; revenue: number; txCount: number }>()
  for (const r of byEntity ?? []) {
    const entInfo = entityMap.get(r.entity_id as string)
    if (!entInfo) continue
    const key = r.entity_id as string
    const existing = byEntityAggregated.get(key) ?? { name: entInfo.name, kind: entInfo.kind, revenue: 0, txCount: 0 }
    existing.revenue += Number(r.revenue)
    existing.txCount += Number(r.transactions_count)
    byEntityAggregated.set(key, existing)
  }

  return (
    <div className="space-y-4 p-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard consolidato</h1>
        <p className="text-sm text-gray-500">{tenant.name} — KPI cross-vertical (hospitality + ristorazione)</p>
      </header>
      <ConsolidatedDashboard
        tenantSlug={tenantSlug}
        fromDate={fromDate}
        toDate={toDate}
        kpiDaily={(kpiDaily ?? []).map((k) => ({
          serviceDate: k.service_date as string,
          revenueHospitality: Number(k.revenue_hospitality ?? 0),
          revenueRestaurant: Number(k.revenue_restaurant ?? 0),
          revenueTotal: Number(k.revenue_total ?? 0),
          bookingsHospitality: Number(k.bookings_hospitality ?? 0),
          ordersRestaurant: Number(k.orders_restaurant ?? 0),
          entitiesActive: Number(k.entities_active ?? 0),
        }))}
        byEntity={Array.from(byEntityAggregated.entries()).map(([id, info]) => ({
          entityId: id,
          name: info.name,
          kind: info.kind,
          revenue: info.revenue,
          txCount: info.txCount,
        }))}
        docsRevenue={(docsRevenue ?? []).map((d) => ({
          vertical: d.vertical as string,
          documentType: d.document_type as string,
          month: d.month as string,
          documentsCount: Number(d.documents_count),
          totalRevenue: Number(d.total_revenue),
          paidAmount: Number(d.paid_amount ?? 0),
          unpaidAmount: Number(d.unpaid_amount ?? 0),
        }))}
      />
    </div>
  )
}
