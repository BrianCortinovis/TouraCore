import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createServiceRoleClient } from '@touracore/db/server'
import { TenantBillingPanel } from './tenant-billing-panel'
import { TenantModulesPanel } from './tenant-modules-panel'

interface Props {
  params: Promise<{ tenantId: string }>
}

export const dynamic = 'force-dynamic'

export default async function PlatformClientDetailPage({ params }: Props) {
  const { tenantId } = await params
  const supabase = await createServiceRoleClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name, slug, is_active, modules, billing_email, created_at')
    .eq('id', tenantId)
    .neq('slug', '__system__')
    .maybeSingle()
  if (!tenant) notFound()

  // Verifica non sia sotto un'agenzia
  const { data: agencyLink } = await supabase
    .from('agency_tenant_links')
    .select('id, agencies(name, slug)')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .maybeSingle()

  const { data: entities } = await supabase
    .from('entities')
    .select('id, name, kind, slug, is_active')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)

  // Billing profile tenant-wide
  const { data: billing } = await supabase
    .from('billing_profiles')
    .select('id, billing_model, subscription_price_eur, commission_percent, commission_cap_eur, commission_min_eur, notes')
    .eq('scope', 'tenant')
    .eq('scope_id', tenantId)
    .is('module_code', null)
    .maybeSingle()

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
  const entityIds = (entities ?? []).map((e) => e.id)
  let revenueMonth = 0
  let bookingsMonth = 0
  if (entityIds.length > 0) {
    // Cap difensivo: pagina admin, una struttura raramente >10k reservations/mese.
    // Follow-up: spostare somma server-side via vista materializzata o RPC.
    const { data: resv } = await supabase
      .from('reservations')
      .select('total_amount')
      .in('entity_id', entityIds)
      .gte('created_at', monthStart)
      .neq('status', 'cancelled')
      .limit(10_000)
    for (const r of resv ?? []) {
      revenueMonth += Number(r.total_amount ?? 0)
      bookingsMonth++
    }
  }

  const EUR = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

  const agencyInfo = agencyLink?.agencies as { name?: string; slug?: string } | null | undefined

  return (
    <div className="space-y-6">
      <nav className="text-xs text-slate-500">
        <Link href="/platform/clients" className="hover:underline">← Clienti diretti</Link>
      </nav>

      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{tenant.name}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {tenant.slug} · {tenant.billing_email ?? 'nessuna email billing'} · creato {new Date(tenant.created_at).toLocaleDateString('it-IT')}
          </p>
          {agencyInfo && (
            <p className="mt-1 text-xs text-amber-600">
              Attenzione: questo tenant è collegato all&apos;agenzia <strong>{agencyInfo.name}</strong>.
              Il billing è gestito dall&apos;agenzia.
            </p>
          )}
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${tenant.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
          {tenant.is_active ? 'Attivo' : 'Sospeso'}
        </span>
      </header>

      {/* KPI */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          { label: 'Incassi mese', value: EUR.format(revenueMonth) },
          { label: 'Prenotazioni mese', value: String(bookingsMonth) },
          { label: 'Strutture/Attività', value: String(entityIds.length) },
        ].map((k) => (
          <div key={k.label} className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{k.label}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{k.value}</p>
          </div>
        ))}
      </section>

      {/* Billing piattaforma→tenant */}
      {!agencyInfo && (
        <TenantBillingPanel tenantId={tenantId} billing={billing ?? null} />
      )}

      {/* Gestione moduli */}
      <TenantModulesPanel
        tenantId={tenantId}
        modules={(tenant.modules ?? {}) as Record<string, { active: boolean; source: string }>}
      />

      {/* Strutture */}
      <section className="rounded-2xl border border-slate-200 bg-white">
        <header className="border-b border-slate-100 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Strutture e attività</h2>
        </header>
        <ul className="divide-y divide-slate-100">
          {(entities ?? []).map((e) => (
            <li key={e.id} className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium">{e.name}</p>
                <p className="text-xs text-slate-400">{e.kind} · {e.slug}</p>
              </div>
            </li>
          ))}
          {(entities ?? []).length === 0 && (
            <li className="p-6 text-center text-sm text-slate-400">Nessuna struttura configurata.</li>
          )}
        </ul>
      </section>
    </div>
  )
}
