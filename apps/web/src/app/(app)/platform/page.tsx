import Link from 'next/link'
import { createServiceRoleClient } from '@touracore/db/server'

export const dynamic = 'force-dynamic'

export default async function PlatformHomePage() {
  const supabase = await createServiceRoleClient()

  const [{ count: agenciesCount }, { count: tenantsCount }, { data: commissions }] = await Promise.all([
    supabase.from('agencies').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('tenants').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('agency_commissions').select('commission_amount, status, accrued_at').gte('accrued_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
  ])

  let mrrEstimated = 0
  let accruedMonth = 0
  for (const c of commissions ?? []) {
    if (c.status !== 'reversed') accruedMonth += Number(c.commission_amount ?? 0)
  }

  const { data: agencies } = await supabase
    .from('agencies')
    .select('id, name, plan, is_active, created_at')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(10)

  const PLAN_PRICE: Record<string, number> = { agency_starter: 99, agency_pro: 299, agency_enterprise: 999 }
  for (const a of agencies ?? []) mrrEstimated += PLAN_PRICE[a.plan] ?? 0

  const { data: recentAudit } = await supabase
    .from('agency_audit_logs')
    .select('id, action, actor_email, agency_id, status, created_at')
    .order('created_at', { ascending: false })
    .limit(10)

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Platform Admin</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">Control Room</h1>
        <p className="mt-1 text-sm text-slate-600">Dashboard consolidato platform.</p>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Kpi label="MRR piattaforma" value={`€${mrrEstimated.toFixed(0)}`} hint="subscription agencies active" />
        <Kpi label="Agenzie attive" value={String(agenciesCount ?? 0)} />
        <Kpi label="Tenant attivi" value={String(tenantsCount ?? 0)} />
        <Kpi label="Commission accrued mese" value={`€${accruedMonth.toFixed(0)}`} />
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Ultime agenzie</h2>
          <ul className="mt-3 divide-y divide-slate-100">
            {(agencies ?? []).map((a) => (
              <li key={a.id} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium">{a.name}</p>
                  <p className="text-xs text-slate-500">{a.plan} · {new Date(a.created_at).toLocaleDateString()}</p>
                </div>
                <Link href={`/platform/agencies/${a.id}`} className="text-xs text-indigo-600 hover:underline">Dettaglio →</Link>
              </li>
            ))}
            {(agencies ?? []).length === 0 && <li className="py-4 text-center text-sm text-slate-500">Nessuna agency.</li>}
          </ul>
          <Link href="/platform/agencies" className="mt-3 inline-block text-xs text-indigo-600 hover:underline">
            Tutte le agenzie →
          </Link>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Audit log recente</h2>
          <ul className="mt-3 divide-y divide-slate-100 text-sm">
            {(recentAudit ?? []).map((a) => (
              <li key={a.id} className="flex items-center justify-between py-1.5">
                <span className="truncate">
                  <span className="font-mono text-xs">{a.action}</span> · {a.actor_email ?? '—'}
                </span>
                <span className={`ml-2 rounded px-1.5 py-0.5 text-[10px] ${a.status === 'denied' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-600'}`}>
                  {a.status}
                </span>
              </li>
            ))}
            {(recentAudit ?? []).length === 0 && <li className="py-4 text-center text-xs text-slate-500">Nessun audit.</li>}
          </ul>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <QuickCard href="/platform/agencies" title="Agenzie" desc="CRUD + impersonate + suspend" />
        <QuickCard href="/platform/config" title="Config plans + commissioni" desc="Plan price, tier threshold, platform fee" />
        <QuickCard href="/platform/tech" title="Tech Ops" desc="Vercel + Supabase + crons + feature flags" />
      </section>
    </div>
  )
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  )
}

function QuickCard({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link href={href} className="rounded-2xl border border-slate-200 bg-white p-5 hover:border-slate-300 hover:shadow">
      <p className="text-lg font-semibold">{title}</p>
      <p className="mt-1 text-xs text-slate-500">{desc}</p>
    </Link>
  )
}
