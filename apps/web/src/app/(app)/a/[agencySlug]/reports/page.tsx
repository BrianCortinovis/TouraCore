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
    ? await supabase.from('entities').select('id, tenant_id, kind').in('tenant_id', tenantIds)
    : { data: [] as { id: string; tenant_id: string; kind: string }[] }
  const entityIds = (entities ?? []).map((e) => e.id)
  const entityKindMap = new Map((entities ?? []).map((e) => [e.id, e.kind]))
  const entityTenantMap = new Map((entities ?? []).map((e) => [e.id, e.tenant_id]))

  const revenueByMonth = new Map<string, number>()
  const bookingsByMonth = new Map<string, number>()
  const revenueByKind = new Map<string, number>()
  const bookingsByKind = new Map<string, number>()
  const revenueByTenant = new Map<string, number>()

  if (entityIds.length > 0) {
    const { data: resv } = await supabase
      .from('reservations')
      .select('total_amount, created_at, status, entity_id')
      .in('entity_id', entityIds)
      .gte('created_at', months[0]!.start)
      .neq('status', 'cancelled')
    for (const r of resv ?? []) {
      const key = r.created_at.slice(0, 7)
      const amt = Number(r.total_amount ?? 0)
      revenueByMonth.set(key, (revenueByMonth.get(key) ?? 0) + amt)
      bookingsByMonth.set(key, (bookingsByMonth.get(key) ?? 0) + 1)
      const kind = entityKindMap.get(r.entity_id as string) ?? 'altro'
      revenueByKind.set(kind, (revenueByKind.get(kind) ?? 0) + amt)
      bookingsByKind.set(kind, (bookingsByKind.get(kind) ?? 0) + 1)
      const tid = entityTenantMap.get(r.entity_id as string)
      if (tid) revenueByTenant.set(tid as string, (revenueByTenant.get(tid as string) ?? 0) + amt)
    }
  }

  const { data: tenantsMeta } = tenantIds.length > 0
    ? await supabase.from('tenants').select('id, name').in('id', tenantIds)
    : { data: [] as { id: string; name: string }[] }
  const tenantNameMap = new Map((tenantsMeta ?? []).map((t) => [t.id, t.name]))

  const topClientsByRevenue = Array.from(revenueByTenant.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([tid, rev]) => ({ tid, name: tenantNameMap.get(tid) ?? 'Cliente', revenue: rev }))

  const kindEntries = Array.from(revenueByKind.entries()).sort((a, b) => b[1] - a[1])
  const maxKindRev = Math.max(1, ...kindEntries.map(([, v]) => v))

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
  const EUR_R = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

  const kindLabelReports = (k: string): string => {
    const map: Record<string, string> = {
      accommodation: 'Struttura ricettiva',
      restaurant: 'Ristorazione',
      activity: 'Esperienze',
      bike_rental: 'Noleggio bike',
      moto_rental: 'Noleggio moto',
      wellness: 'Wellness',
      ski_school: 'Scuola sci',
      altro: 'Altro',
    }
    return map[k] ?? k
  }

  return (
    <div className="space-y-4 px-5 py-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Report · {agency.name}</h1>
          <p className="text-xs text-slate-500">Andamento ultimi 6 mesi · incassi, prenotazioni, commissioni, mix verticali e top clienti.</p>
        </div>
        <a href={`/a/${agencySlug}/reports/export?range=6mo`} className="rounded border border-slate-300 px-3 py-1.5 text-xs">Esporta CSV</a>
      </header>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Incassi mensili (ultimi 6 mesi)</h2>
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
                <p className="text-[10px] text-slate-500">{EUR_R.format(Math.round(rev))}</p>
              </div>
            )
          })}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Tabella di riepilogo</h2>
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-slate-400">
              <th className="pb-2">Mese</th>
              <th className="pb-2 text-right">Incassi</th>
              <th className="pb-2 text-right">Prenotazioni</th>
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
                  <td className="py-2 text-right tabular-nums">{EUR_R.format(Math.round(rev))}</td>
                  <td className="py-2 text-right">{bk}</td>
                  <td className="py-2 text-right tabular-nums">{EUR_R.format(Math.round(cm))}</td>
                  <td className="py-2 text-right">{pct.toFixed(1)}%</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>

      <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Distribuzione incassi per tipo attività
          </h2>
          {kindEntries.length === 0 ? (
            <p className="py-3 text-center text-xs text-slate-500">Nessun dato.</p>
          ) : (
            <ul className="space-y-1.5">
              {kindEntries.map(([kind, rev]) => {
                const pct = (rev / maxKindRev) * 100
                const bookings = bookingsByKind.get(kind) ?? 0
                return (
                  <li key={kind} className="flex items-center gap-2 text-xs">
                    <span className="w-32 shrink-0 text-slate-600">{kindLabelReports(kind)}</span>
                    <div className="relative h-3 flex-1 overflow-hidden rounded bg-slate-100">
                      <div className="absolute inset-y-0 left-0 rounded bg-indigo-500" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-16 shrink-0 text-right tabular-nums text-slate-700">{EUR_R.format(Math.round(rev))}</span>
                    <span className="w-14 shrink-0 text-right text-[10px] text-slate-400">{bookings} pren.</span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Top 10 clienti per incassi (6 mesi)
          </h2>
          {topClientsByRevenue.length === 0 ? (
            <p className="py-3 text-center text-xs text-slate-500">Nessun dato.</p>
          ) : (
            <ol className="space-y-1">
              {topClientsByRevenue.map((c, i) => (
                <li key={c.tid} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-indigo-50 text-[10px] font-semibold text-indigo-700">
                      {i + 1}
                    </span>
                    <a href={`/a/${agencySlug}/clients/${c.tid}`} className="font-medium text-slate-700 hover:text-indigo-600">
                      {c.name}
                    </a>
                  </span>
                  <span className="tabular-nums text-slate-700">{EUR_R.format(Math.round(c.revenue))}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>
    </div>
  )
}
