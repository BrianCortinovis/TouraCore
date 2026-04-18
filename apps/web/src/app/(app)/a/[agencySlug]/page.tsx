import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServiceRoleClient } from '@touracore/db/server'
import { getVisibilityContext } from '@touracore/auth/visibility'

interface AgencyHomePageProps {
  params: Promise<{ agencySlug: string }>
}

export const dynamic = 'force-dynamic'

export default async function AgencyHomePage({ params }: AgencyHomePageProps) {
  const { agencySlug } = await params
  const ctx = await getVisibilityContext()
  const supabase = await createServiceRoleClient()

  const { data: agency } = await supabase
    .from('agencies')
    .select('id, name, plan, max_tenants')
    .eq('slug', agencySlug)
    .maybeSingle()
  if (!agency) notFound()

  const { data: links } = await supabase
    .from('agency_tenant_links')
    .select('tenant_id, status')
    .eq('agency_id', agency.id)
    .eq('status', 'active')

  const tenantIds = (links ?? []).map((l) => l.tenant_id as string)

  const { data: entities } = tenantIds.length > 0
    ? await supabase.from('entities').select('id, tenant_id, name').in('tenant_id', tenantIds)
    : { data: [] as { id: string; tenant_id: string; name: string }[] }

  const entityIds = (entities ?? []).map((e) => e.id)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString().slice(0, 10)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  let revenueMonth = 0
  let bookingsToday = 0
  let bookingsMonth = 0
  const revenueByTenant = new Map<string, number>()

  if (entityIds.length > 0) {
    const { data: resvMonth } = await supabase
      .from('reservations')
      .select('entity_id, total_amount, created_at, check_in, status')
      .in('entity_id', entityIds)
      .gte('created_at', monthStart)
      .neq('status', 'cancelled')

    for (const r of resvMonth ?? []) {
      const amt = Number(r.total_amount ?? 0)
      revenueMonth += amt
      bookingsMonth++
      const ent = entities?.find((e) => e.id === r.entity_id)
      if (ent) {
        revenueByTenant.set(ent.tenant_id, (revenueByTenant.get(ent.tenant_id) ?? 0) + amt)
      }
      if (r.check_in === today) bookingsToday++
    }

    const { data: expResv } = await supabase
      .from('experience_reservations')
      .select('entity_id, total_amount, created_at, status')
      .in('entity_id', entityIds)
      .gte('created_at', monthStart)
      .neq('status', 'cancelled')

    for (const r of expResv ?? []) {
      const amt = Number((r as { total_amount: number }).total_amount ?? 0)
      revenueMonth += amt
      bookingsMonth++
      const ent = entities?.find((e) => e.id === r.entity_id)
      if (ent) {
        revenueByTenant.set(ent.tenant_id, (revenueByTenant.get(ent.tenant_id) ?? 0) + amt)
      }
    }
  }

  const { data: tenants } = tenantIds.length > 0
    ? await supabase.from('tenants').select('id, name, slug').in('id', tenantIds)
    : { data: [] as { id: string; name: string; slug: string }[] }

  const topTenants = Array.from(revenueByTenant.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tenantId, rev]) => {
      const t = tenants?.find((x) => x.id === tenantId)
      return { tenantId, name: t?.name ?? tenantId.slice(0, 8), slug: t?.slug ?? '', revenue: rev }
    })

  return (
    <div className="space-y-6 px-6 py-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-500">
          Agency Dashboard
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">{agency.name}</h1>
        <p className="mt-1 text-sm text-slate-600">
          Piano <span className="font-medium">{agency.plan}</span> · {tenantIds.length}/{agency.max_tenants ?? '∞'} clienti attivi · ruolo {ctx.agencyRole ?? 'platform'}
        </p>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Kpi label="Revenue mese" value={`€${revenueMonth.toFixed(2)}`} />
        <Kpi label="Bookings oggi" value={String(bookingsToday)} />
        <Kpi label="Bookings mese" value={String(bookingsMonth)} />
        <Kpi label="Clienti attivi" value={String(tenantIds.length)} />
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Top clienti (revenue mese)
          </h2>
          {topTenants.length === 0 ? (
            <p className="text-sm text-slate-500">Nessun booking questo mese.</p>
          ) : (
            <ul className="space-y-2">
              {topTenants.map((t) => (
                <li key={t.tenantId} className="flex items-center justify-between">
                  <Link href={`/a/${agencySlug}/clients/${t.tenantId}`} className="text-sm font-medium text-indigo-700 hover:underline">
                    {t.name}
                  </Link>
                  <span className="text-sm tabular-nums text-slate-700">€{t.revenue.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Quick actions
          </h2>
          <div className="grid grid-cols-2 gap-2">
            <Quick href={`/a/${agencySlug}/clients`} label="Clienti" />
            <Quick href={`/a/${agencySlug}/team`} label="Team" />
            <Quick href={`/a/${agencySlug}/commissions`} label="Commissioni" />
            <Quick href={`/a/${agencySlug}/billing`} label="Billing" />
            <Quick href={`/a/${agencySlug}/reports`} label="Report" />
            <Quick href={`/a/${agencySlug}/settings`} label="Branding" />
          </div>
        </div>
      </section>
    </div>
  )
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  )
}

function Quick({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white hover:shadow-sm"
    >
      {label}
    </Link>
  )
}
