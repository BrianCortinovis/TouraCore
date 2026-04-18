import Link from 'next/link'
import { createServiceRoleClient } from '@touracore/db/server'

interface AgencyScopedHomePageProps {
  params: Promise<{ agencySlug: string }>
}

export default async function AgencyScopedHomePage({ params }: AgencyScopedHomePageProps) {
  const { agencySlug } = await params
  const supabase = await createServiceRoleClient()
  const { data: agency } = await supabase
    .from('agencies')
    .select('id, name, plan, max_tenants')
    .eq('slug', agencySlug)
    .maybeSingle()

  const { count: tenantCount } = agency
    ? await supabase
        .from('agency_tenant_links')
        .select('id', { count: 'exact', head: true })
        .eq('agency_id', agency.id)
        .eq('status', 'active')
    : { count: 0 }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
          Agency
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">
          {agency?.name ?? agencySlug}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Piano: <span className="font-medium">{agency?.plan ?? 'n/a'}</span>
          {' · '}
          Clienti attivi: <span className="font-medium">{tenantCount ?? 0}</span>
          {agency?.max_tenants ? ` / ${agency.max_tenants}` : ''}
        </p>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Link
          href={`/a/${agencySlug}/clients`}
          className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:shadow"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            M070
          </p>
          <p className="mt-1 text-lg font-semibold text-slate-900">Clienti</p>
          <p className="mt-2 text-sm text-slate-500">
            Onboarding nuovo tenant, billing_mode, moduli attivi.
          </p>
        </Link>
        <Link
          href={`/a/${agencySlug}/billing`}
          className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:shadow"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            M071
          </p>
          <p className="mt-1 text-lg font-semibold text-slate-900">Billing</p>
          <p className="mt-2 text-sm text-slate-500">
            Subscription, fatture, Stripe Connect payout.
          </p>
        </Link>
        <Link
          href={`/a/${agencySlug}/commissions`}
          className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:shadow"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            M072
          </p>
          <p className="mt-1 text-lg font-semibold text-slate-900">Commissioni</p>
          <p className="mt-2 text-sm text-slate-500">
            Tier scalettato cross-vertical, auto-payout.
          </p>
        </Link>
      </section>
    </div>
  )
}
