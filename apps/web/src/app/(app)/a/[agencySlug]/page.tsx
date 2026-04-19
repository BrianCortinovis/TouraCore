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
    <div className="space-y-4 px-5 py-4">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-indigo-500">
            Pannello agenzia
          </p>
          <h1 className="mt-0.5 text-xl font-semibold text-slate-900">{agency.name}</h1>
          <p className="text-xs text-slate-500">
            Piano {planLabel(agency.plan)} · {tenantIds.length}/{agency.max_tenants ?? '∞'} clienti · {roleLabel(ctx.agencyRole)}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/a/${agencySlug}/broadcast`} className="rounded bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700">
            Invia avviso
          </Link>
          <Link href={`/a/${agencySlug}/clients`} className="rounded border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
            + Nuovo cliente
          </Link>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Kpi label="Incassi mese" value={formatEUR(revenueMonth)} />
        <Kpi label="Prenotazioni oggi" value={formatInt(bookingsToday)} />
        <Kpi label="Prenotazioni mese" value={formatInt(bookingsMonth)} />
        <Kpi label="Clienti attivi" value={formatInt(tenantIds.length)} />
      </section>

      <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Top clienti del mese
          </h2>
          {topTenants.length === 0 ? (
            <p className="text-xs text-slate-500">Nessuna prenotazione questo mese.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {topTenants.map((t) => (
                <li key={t.tenantId} className="flex items-center justify-between py-1.5">
                  <Link href={`/a/${agencySlug}/clients/${t.tenantId}`} className="text-sm font-medium text-indigo-700 hover:underline">
                    {t.name}
                  </Link>
                  <span className="text-xs tabular-nums text-slate-700">{formatEUR(t.revenue)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Azioni rapide
          </h2>
          <div className="grid grid-cols-3 gap-1.5">
            <Quick href={`/a/${agencySlug}/clients`} label="Clienti" />
            <Quick href={`/a/${agencySlug}/broadcast`} label="Avvisi" />
            <Quick href={`/a/${agencySlug}/reports`} label="Report" />
            <Quick href={`/a/${agencySlug}/commissions`} label="Commissioni" />
            <Quick href={`/a/${agencySlug}/billing`} label="Fatturazione" />
            <Quick href={`/a/${agencySlug}/team`} label="Collaboratori" />
            <Quick href={`/a/${agencySlug}/messaging`} label="Messaggistica" />
            <Quick href={`/a/${agencySlug}/settings`} label="Impostazioni" />
          </div>
        </div>
      </section>
    </div>
  )
}

const EUR_FMT = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
const INT_FMT = new Intl.NumberFormat('it-IT')

function formatEUR(n: number): string {
  return EUR_FMT.format(Math.round(n))
}

function formatInt(n: number): string {
  return INT_FMT.format(n)
}

function planLabel(p: string | null | undefined): string {
  switch (p) {
    case 'agency_starter': return 'Starter'
    case 'agency_pro': return 'Pro'
    case 'agency_enterprise': return 'Enterprise'
    case 'custom': return 'Personalizzato'
    default: return p ?? '—'
  }
}

function roleLabel(r: string | null | undefined): string {
  switch (r) {
    case 'agency_owner': return 'Titolare'
    case 'agency_admin': return 'Amministratore'
    case 'agency_member': return 'Collaboratore'
    default: return 'Piattaforma'
  }
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums text-slate-900">{value}</p>
    </div>
  )
}

function Quick({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded border border-slate-200 bg-slate-50 px-2 py-1.5 text-center text-xs font-medium text-slate-700 hover:bg-white hover:shadow-sm"
    >
      {label}
    </Link>
  )
}
