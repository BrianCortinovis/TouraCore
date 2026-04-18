import { notFound } from 'next/navigation'
import { createServiceRoleClient } from '@touracore/db/server'

interface ReportsProps {
  params: Promise<{ agencySlug: string }>
}

export const dynamic = 'force-dynamic'

export default async function ReportsPage({ params }: ReportsProps) {
  const { agencySlug } = await params
  const supabase = await createServiceRoleClient()
  const { data: agency } = await supabase.from('agencies').select('id, name').eq('slug', agencySlug).maybeSingle()
  if (!agency) notFound()

  const { data: links } = await supabase.from('agency_tenant_links').select('tenant_id').eq('agency_id', agency.id).eq('status', 'active')
  const tenantIds = (links ?? []).map((l) => l.tenant_id as string)

  const now = new Date()
  const months: { key: string; label: string; start: string; end: string }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const e = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
    months.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleString('it', { month: 'short', year: '2-digit' }),
      start: d.toISOString(),
      end: e.toISOString(),
    })
  }

  const { data: entities } = tenantIds.length > 0
    ? await supabase.from('entities').select('id, tenant_id').in('tenant_id', tenantIds)
    : { data: [] as { id: string; tenant_id: string }[] }
  const entityIds = (entities ?? []).map((e) => e.id)

  const revenueByMonth = new Map<string, number>()
  const bookingsByMonth = new Map<string, number>()

  if (entityIds.length > 0) {
    const { data: resv } = await supabase
      .from('reservations')
      .select('total_amount, created_at, status')
      .in('entity_id', entityIds)
      .gte('created_at', months[0]!.start)
      .neq('status', 'cancelled')
    for (const r of resv ?? []) {
      const key = r.created_at.slice(0, 7)
      revenueByMonth.set(key, (revenueByMonth.get(key) ?? 0) + Number(r.total_amount ?? 0))
      bookingsByMonth.set(key, (bookingsByMonth.get(key) ?? 0) + 1)
    }
  }

  const { data: commissions } = await supabase
    .from('agency_commissions')
    .select('accrued_at, commission_amount, status')
    .eq('agency_id', agency.id)
    .gte('accrued_at', months[0]!.start)
    .neq('status', 'reversed')
  const commByMonth = new Map<string, number>()
  for (const c of commissions ?? []) {
    const key = c.accrued_at.slice(0, 7)
    commByMonth.set(key, (commByMonth.get(key) ?? 0) + Number(c.commission_amount ?? 0))
  }

  const maxRev = Math.max(1, ...months.map((m) => revenueByMonth.get(m.key) ?? 0))

  return (
    <div className="space-y-6 px-6 py-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Reports · {agency.name}</h1>
          <p className="mt-1 text-sm text-slate-600">Trend 6 mesi · revenue + bookings + commissioni.</p>
        </div>
        <a href={`/a/${agencySlug}/reports/export?range=6mo`} className="rounded border border-slate-300 px-3 py-2 text-sm">Export CSV</a>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Revenue mensile (6 mesi)</h2>
        <div className="mt-4 flex items-end gap-2">
          {months.map((m) => {
            const rev = revenueByMonth.get(m.key) ?? 0
            const h = Math.max(4, Math.round((rev / maxRev) * 180))
            return (
              <div key={m.key} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex h-48 w-full items-end">
                  <div className="w-full rounded-t bg-indigo-500" style={{ height: `${h}px` }} />
                </div>
                <p className="text-xs font-medium">{m.label}</p>
                <p className="text-[10px] text-slate-500">€{rev.toFixed(0)}</p>
              </div>
            )
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Tabella dettaglio</h2>
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-slate-400">
              <th className="pb-2">Mese</th>
              <th className="pb-2 text-right">Revenue</th>
              <th className="pb-2 text-right">Bookings</th>
              <th className="pb-2 text-right">Commissioni</th>
              <th className="pb-2 text-right">% commissione</th>
            </tr>
          </thead>
          <tbody>
            {months.map((m) => {
              const rev = revenueByMonth.get(m.key) ?? 0
              const bk = bookingsByMonth.get(m.key) ?? 0
              const cm = commByMonth.get(m.key) ?? 0
              const pct = rev > 0 ? (cm / rev) * 100 : 0
              return (
                <tr key={m.key} className="border-t border-slate-100">
                  <td className="py-2">{m.label}</td>
                  <td className="py-2 text-right tabular-nums">€{rev.toFixed(2)}</td>
                  <td className="py-2 text-right">{bk}</td>
                  <td className="py-2 text-right tabular-nums">€{cm.toFixed(2)}</td>
                  <td className="py-2 text-right">{pct.toFixed(1)}%</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>
    </div>
  )
}
