import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createServiceRoleClient } from '@touracore/db/server'
import { SuspendButton, ReactivateButton } from './actions-buttons'
import { AgencyBillingPanel, type AgencyPlatformBillingRecord } from './agency-billing-panel'

interface Props {
  params: Promise<{ agencyId: string }>
}

export const dynamic = 'force-dynamic'

export default async function PlatformAgencyDetailPage({ params }: Props) {
  const { agencyId } = await params
  const supabase = await createServiceRoleClient()

  const { data: agency } = await supabase
    .from('agencies')
    .select('*')
    .eq('id', agencyId)
    .maybeSingle()
  if (!agency) notFound()

  const [{ data: memberships }, { data: tenantLinks }, { data: audit }, { data: platformBilling }] = await Promise.all([
    supabase.from('agency_memberships').select('id, user_id, role, is_active, created_at').eq('agency_id', agencyId),
    supabase.from('agency_tenant_links').select('id, tenant_id, status, billing_mode').eq('agency_id', agencyId),
    supabase.from('agency_audit_logs').select('id, action, actor_email, status, created_at').eq('agency_id', agencyId).order('created_at', { ascending: false }).limit(20),
    supabase.from('agency_platform_billing').select('billing_model, fee_monthly_eur, commission_pct, commission_base, commission_cap_monthly_eur, commission_min_monthly_eur, commission_threshold_eur, notes, valid_from, valid_until').eq('agency_id', agencyId).maybeSingle(),
  ])

  return (
    <div className="space-y-6">
      <nav className="text-xs text-slate-500">
        <Link href="/platform/agencies" className="hover:underline">← Agenzie</Link>
      </nav>

      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{agency.name}</h1>
          <p className="mt-1 text-sm text-slate-600">
            {agency.slug} · piano {agency.plan} · {agency.is_active ? 'attiva' : 'sospesa'}
          </p>
        </div>
        <div className="flex gap-2">
          {agency.is_active ? (
            <SuspendButton agencyId={agency.id} />
          ) : (
            <ReactivateButton agencyId={agency.id} />
          )}
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card title="Membri" value={memberships?.filter((m) => m.is_active).length ?? 0} />
        <Card title="Tenant links" value={tenantLinks?.filter((l) => l.status === 'active').length ?? 0} />
        <Card title="Max tenants" value={agency.max_tenants ?? '∞'} />
      </section>

      <AgencyBillingPanel
        agencyId={agency.id}
        billing={platformBilling as AgencyPlatformBillingRecord | null}
      />

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Audit log (20 recenti)</h2>
        <ul className="mt-3 divide-y divide-slate-100 text-sm">
          {(audit ?? []).map((a) => (
            <li key={a.id} className="flex items-center justify-between py-2">
              <div>
                <p className="font-mono text-xs">{a.action}</p>
                <p className="text-xs text-slate-500">{a.actor_email} · {new Date(a.created_at).toLocaleString()}</p>
              </div>
              <span className={`rounded px-2 py-0.5 text-[10px] ${a.status === 'denied' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
                {a.status}
              </span>
            </li>
          ))}
          {(audit ?? []).length === 0 && <li className="py-4 text-center text-xs text-slate-500">Nessuna entry.</li>}
        </ul>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Raw JSON</h2>
        <pre className="mt-2 overflow-x-auto rounded bg-slate-50 p-3 text-xs">{JSON.stringify(agency, null, 2)}</pre>
      </section>
    </div>
  )
}

function Card({ title, value }: { title: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs uppercase text-slate-400">{title}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  )
}
