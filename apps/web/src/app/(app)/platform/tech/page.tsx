import { createServiceRoleClient } from '@touracore/db/server'

export const dynamic = 'force-dynamic'

export default async function TechOpsPage() {
  const supabase = await createServiceRoleClient()

  const [{ count: agencies }, { count: tenants }, { count: commissions }, { count: auditLogs }, { count: reservations }] = await Promise.all([
    supabase.from('agencies').select('id', { count: 'exact', head: true }),
    supabase.from('tenants').select('id', { count: 'exact', head: true }),
    supabase.from('agency_commissions').select('id', { count: 'exact', head: true }),
    supabase.from('agency_audit_logs').select('id', { count: 'exact', head: true }),
    supabase.from('reservations').select('id', { count: 'exact', head: true }),
  ])

  const migrations = [
    '00121 agency_audit_logs',
    '00122 agency_invitations + RPC accept',
    '00123 agency_commissions polymorphic',
    '00124 platform_config (plans+tiers+fee)',
  ]

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Tech Ops</h1>
        <p className="mt-1 text-sm text-slate-600">
          Operations dashboard · Vercel + Supabase + crons + system counts.
        </p>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-5">
        <Count label="Agencies" value={agencies ?? 0} />
        <Count label="Tenants" value={tenants ?? 0} />
        <Count label="Reservations" value={reservations ?? 0} />
        <Count label="Commissions" value={commissions ?? 0} />
        <Count label="Audit logs" value={auditLogs ?? 0} />
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card title="Vercel deployment">
          <ul className="text-sm">
            <li>Project: <span className="font-mono">touracore</span></li>
            <li>URL: <a className="text-indigo-600 hover:underline" href="https://touracore.vercel.app" target="_blank">touracore.vercel.app</a></li>
            <li>Dashboard: <a className="text-indigo-600 hover:underline" href="https://vercel.com/dashboard" target="_blank">vercel.com/dashboard →</a></li>
            <li>Branch: main (push-to-deploy)</li>
          </ul>
        </Card>

        <Card title="Supabase">
          <ul className="text-sm">
            <li>Project ID: <span className="font-mono">dysnrgnqzliodqrsohoz</span></li>
            <li>Region: EU</li>
            <li>Dashboard: <a className="text-indigo-600 hover:underline" href="https://supabase.com/dashboard/project/dysnrgnqzliodqrsohoz" target="_blank">open →</a></li>
          </ul>
        </Card>

        <Card title="Migrations (last 4)">
          <ul className="space-y-1 text-sm">
            {migrations.map((m) => (
              <li key={m} className="font-mono text-xs">{m}</li>
            ))}
          </ul>
        </Card>

        <Card title="Crons">
          <ul className="text-sm">
            <li>/api/cron/pricing-suggestions — daily</li>
            <li>/api/cron/restaurant-pricing-suggestions — daily</li>
            <li>Commission payout — M072 manual trigger (v2: monthly)</li>
          </ul>
        </Card>
      </section>

      <Card title="Health check">
        <p className="text-sm text-slate-600">Endpoint test:</p>
        <ul className="mt-2 text-sm">
          <li>/ → 200 (public listings)</li>
          <li>/platform → 200 (platform admin)</li>
          <li>/a/[slug] → 200 (agency)</li>
          <li>/[tenantSlug] → 200 (tenant)</li>
        </ul>
      </Card>
    </div>
  )
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs uppercase text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
      <div>{children}</div>
    </div>
  )
}
