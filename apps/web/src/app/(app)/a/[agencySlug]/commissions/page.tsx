import { notFound } from 'next/navigation'
import { createServiceRoleClient } from '@touracore/db/server'
import { getVisibilityContext } from '@touracore/auth/visibility'
import { DEFAULT_TIERS } from '@touracore/agency'

interface CommissionsPageProps {
  params: Promise<{ agencySlug: string }>
}

export const dynamic = 'force-dynamic'

export default async function CommissionsPage({ params }: CommissionsPageProps) {
  const { agencySlug } = await params
  const _ctx = await getVisibilityContext()
  const supabase = await createServiceRoleClient()

  const { data: agency } = await supabase.from('agencies').select('id, name').eq('slug', agencySlug).maybeSingle()
  if (!agency) notFound()

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

  const { data: rows } = await supabase
    .from('agency_commissions')
    .select('id, tenant_id, reservation_type, gross_amount, commission_rate, commission_amount, status, accrued_at, paid_at, currency')
    .eq('agency_id', agency.id)
    .order('accrued_at', { ascending: false })
    .limit(100)

  const monthRows = (rows ?? []).filter((r) => r.accrued_at >= monthStart)

  let accruedMonth = 0
  let paidMonth = 0
  let reversedMonth = 0
  const byType: Record<string, { revenue: number; commission: number }> = {}

  for (const r of monthRows) {
    const amt = Number(r.commission_amount ?? 0)
    if (r.status === 'accrued') accruedMonth += amt
    if (r.status === 'paid') paidMonth += amt
    if (r.status === 'reversed') reversedMonth += amt
    const k = r.reservation_type
    byType[k] = byType[k] ?? { revenue: 0, commission: 0 }
    if (r.status !== 'reversed') {
      byType[k].revenue += Number(r.gross_amount ?? 0)
      byType[k].commission += amt
    }
  }

  const tenantIds = [...new Set((rows ?? []).map((r) => r.tenant_id).filter((x): x is string => Boolean(x)))]
  const { data: tenants } = tenantIds.length > 0
    ? await supabase.from('tenants').select('id, name').in('id', tenantIds)
    : { data: [] as { id: string; name: string }[] }

  return (
    <div className="space-y-6 px-6 py-6">
      <header>
        <h1 className="text-2xl font-semibold">Commissioni · {agency.name}</h1>
        <p className="mt-1 text-sm text-slate-600">
          Tier scalettato cross-vertical. Commissioni accrued vengono pagate via Stripe Connect a fine mese.
        </p>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Kpi label="Accrued mese" value={`€${accruedMonth.toFixed(2)}`} tone="indigo" />
        <Kpi label="Paid mese" value={`€${paidMonth.toFixed(2)}`} tone="emerald" />
        <Kpi label="Reversed mese" value={`€${reversedMonth.toFixed(2)}`} tone="rose" />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Per vertical (mese)</h2>
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-slate-400">
              <th className="pb-2">Vertical</th>
              <th className="pb-2 text-right">Revenue</th>
              <th className="pb-2 text-right">Commission</th>
              <th className="pb-2 text-right">Rate attuale</th>
              <th className="pb-2 text-right">Next threshold</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(byType).length === 0 && (
              <tr><td colSpan={5} className="py-6 text-center text-slate-500">Nessuna commission questo mese.</td></tr>
            )}
            {Object.entries(byType).map(([type, v]) => {
              const tiers = DEFAULT_TIERS[type as keyof typeof DEFAULT_TIERS] ?? []
              const next = tiers.find((t) => t.threshold > v.revenue)
              const current = [...tiers].reverse().find((t) => v.revenue >= t.threshold)
              return (
                <tr key={type} className="border-t border-slate-100">
                  <td className="py-2 capitalize">{type}</td>
                  <td className="py-2 text-right tabular-nums">€{v.revenue.toFixed(2)}</td>
                  <td className="py-2 text-right tabular-nums font-medium">€{v.commission.toFixed(2)}</td>
                  <td className="py-2 text-right">{((current?.rate ?? 0) * 100).toFixed(1)}%</td>
                  <td className="py-2 text-right text-xs text-slate-500">
                    {next ? `€${next.threshold} → ${(next.rate * 100).toFixed(1)}%` : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white">
        <header className="flex items-center justify-between border-b border-slate-100 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Ultime 100 voci</h2>
          <a href={`/a/${agencySlug}/commissions/export`} className="text-xs text-indigo-600 hover:underline">Export CSV →</a>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <th className="px-4 py-2">Data</th>
                <th className="px-4 py-2">Tenant</th>
                <th className="px-4 py-2">Tipo</th>
                <th className="px-4 py-2 text-right">Gross</th>
                <th className="px-4 py-2 text-right">Rate</th>
                <th className="px-4 py-2 text-right">Comm.</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {(rows ?? []).map((r) => {
                const t = tenants?.find((x) => x.id === r.tenant_id)
                return (
                  <tr key={r.id} className="border-t border-slate-100">
                    <td className="px-4 py-2 text-xs">{new Date(r.accrued_at).toLocaleDateString()}</td>
                    <td className="px-4 py-2">{t?.name ?? r.tenant_id?.slice(0, 8) ?? '—'}</td>
                    <td className="px-4 py-2 capitalize">{r.reservation_type}</td>
                    <td className="px-4 py-2 text-right tabular-nums">€{Number(r.gross_amount).toFixed(2)}</td>
                    <td className="px-4 py-2 text-right">{(Number(r.commission_rate) * 100).toFixed(1)}%</td>
                    <td className="px-4 py-2 text-right tabular-nums font-medium">€{Number(r.commission_amount).toFixed(2)}</td>
                    <td className="px-4 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${
                        r.status === 'paid' ? 'bg-emerald-100 text-emerald-800'
                          : r.status === 'reversed' ? 'bg-rose-100 text-rose-800'
                            : 'bg-indigo-100 text-indigo-800'
                      }`}>{r.status}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function Kpi({ label, value, tone }: { label: string; value: string; tone: 'indigo' | 'emerald' | 'rose' }) {
  const cls = tone === 'emerald' ? 'text-emerald-700' : tone === 'rose' ? 'text-rose-700' : 'text-indigo-700'
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${cls}`}>{value}</p>
    </div>
  )
}
