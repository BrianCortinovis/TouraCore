import { createServiceRoleClient } from '@touracore/db/server'
import { Building2, GitBranch, Layers3, Users } from 'lucide-react'
import { MetricCard, SectionCard, StatusBadge, TrendList } from '../_components'
import { buildMonthBuckets, fillBucketsFromRows, formatDate, formatNumber } from '../_lib'

interface TenantRow {
  id: string
  name: string
  slug: string
  country: string | null
  created_at: string
  modules: Record<string, boolean> | null
  agency_id: string | null
  is_active: boolean | null
}

interface EntityRow {
  tenant_id: string
  created_at: string
  type: string | null
  is_active: boolean | null
}

interface AgencyLinkRow {
  agency_id: string
  status: string | null
}

function formatModuleLabel(key: string) {
  return key
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase())
}

export default async function SuperadminTenancyPage() {
  const supabase = await createServiceRoleClient()
  const monthBuckets = buildMonthBuckets(6)
  const since = new Date(`${monthBuckets[0]!.key}-01T00:00:00.000Z`).toISOString()

  const [
    { data: tenants },
    { data: entities },
    { data: agencies },
    { data: staffMembers },
    { data: agencyLinks },
  ] = await Promise.all([
    supabase
      .from('tenants')
      .select('id, name, slug, country, created_at, modules, agency_id, is_active')
      .order('created_at', { ascending: false }),
    supabase
      .from('entities')
      .select('tenant_id, created_at, type, is_active')
      .gte('created_at', since)
      .order('created_at', { ascending: true }),
    supabase.from('agencies').select('id, name, slug, is_active'),
    supabase
      .from('staff_members')
      .select('id, entity_id, created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: true }),
    supabase
      .from('agency_tenant_links')
      .select('agency_id, status')
      .eq('status', 'active'),
  ])

  const tenantRows = (tenants ?? []) as TenantRow[]
  const entityRows = (entities ?? []) as EntityRow[]
  const agencyRows = (agencies ?? []) as { id: string; name: string; slug: string | null; is_active: boolean | null }[]
  const staffRows = (staffMembers ?? []) as { entity_id: string | null; created_at: string }[]
  const linkRows = (agencyLinks ?? []) as AgencyLinkRow[]

  const tenantGrowth = fillBucketsFromRows(monthBuckets, tenantRows, (row) => row.created_at)
  const entityGrowth = fillBucketsFromRows(monthBuckets, entityRows, (row) => row.created_at)
  const staffGrowth = fillBucketsFromRows(monthBuckets, staffRows, (row) => row.created_at)

  const moduleCounts = new Map<string, number>()
  for (const tenant of tenantRows) {
    for (const [key, enabled] of Object.entries(tenant.modules ?? {})) {
      if (!enabled) continue
      moduleCounts.set(key, (moduleCounts.get(key) ?? 0) + 1)
    }
  }

  const topModules = Array.from(moduleCounts.entries())
    .map(([key, value]) => ({ key, label: formatModuleLabel(key), value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6)

  const agencyTenantCount = tenantRows.filter((tenant) => tenant.agency_id).length
  const activeTenants = tenantRows.filter((tenant) => tenant.is_active).length
  const activeAgencies = agencyRows.filter((agency) => agency.is_active).length
  const activeLinks = linkRows.length
  const avgEntitiesPerTenant = tenantRows.length > 0 ? entityRows.length / tenantRows.length : 0
  const topTenantsByEntities = tenantRows
    .map((tenant) => ({
      ...tenant,
      entityCount: entityRows.filter((entity) => entity.tenant_id === tenant.id).length,
    }))
    .sort((a, b) => b.entityCount - a.entityCount)
    .slice(0, 6)

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
            <GitBranch className="h-3.5 w-3.5" />
            Tenancy
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
            Tenant, agency e entity isolation
          </h1>
          <p className="max-w-3xl text-sm leading-6 text-slate-500">
            La suite non è un modello unico: ogni struttura ha il suo type, il suo scope e i suoi
            settings. Qui controlli come il sistema si distribuisce tra tenant, agency ed entity.
          </p>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Tenants active" value={formatNumber(activeTenants)} hint={`${formatNumber(tenantRows.length)} totali`} icon={Building2} tone="blue" />
        <MetricCard label="Agency-linked" value={formatNumber(agencyTenantCount)} hint={`${formatNumber(activeLinks)} links attivi`} icon={Layers3} tone="violet" />
        <MetricCard label="Entities" value={formatNumber(entityRows.length)} hint={`Media ${avgEntitiesPerTenant.toFixed(1)} per tenant`} icon={GitBranch} tone="emerald" />
        <MetricCard label="Staff growth" value={formatNumber(staffRows.length)} hint={`${formatNumber(activeAgencies)} agenzie attive`} icon={Users} tone="amber" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <SectionCard title="Growth timeline" description="Creazione tenant, entity e staff nel tempo.">
          <div className="space-y-6">
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Tenant</p>
              <TrendList items={tenantGrowth} valueLabel="tenant" barTone="bg-blue-600" />
            </div>
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Entities</p>
              <TrendList items={entityGrowth} valueLabel="entity" barTone="bg-emerald-600" />
            </div>
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Staff</p>
              <TrendList items={staffGrowth} valueLabel="staff" barTone="bg-violet-600" />
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Clienti e agenzie" description="Quanti clienti sono gestiti tramite un'agenzia partner.">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Clienti diretti</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{formatNumber(tenantRows.length - agencyTenantCount)}</p>
              <p className="text-sm text-slate-500">Non collegati a un&apos;agenzia</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Clienti di agenzia</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{formatNumber(agencyTenantCount)}</p>
              <p className="text-sm text-slate-500">Gestiti tramite un&apos;agenzia</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <StatusBadge tone={activeAgencies ? 'emerald' : 'amber'}>
              {activeAgencies} agenzie attive
            </StatusBadge>
            <StatusBadge tone={activeLinks ? 'emerald' : 'slate'}>
              {activeLinks} collegamenti attivi
            </StatusBadge>
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <SectionCard title="Moduli più usati" description="Funzionalità verticali e condivise adottate dai clienti.">
          <TrendList items={topModules} valueLabel="clienti" barTone="bg-slate-900" />
        </SectionCard>

        <SectionCard title="Ultimi clienti registrati" description="Nuove attività aggiunte alla piattaforma.">
          {tenantRows.length === 0 ? (
            <p className="text-sm text-slate-500">Nessun cliente registrato.</p>
          ) : (
            <div className="divide-y divide-slate-200">
              {tenantRows.slice(0, 8).map((tenant) => (
                <div key={tenant.id} className="flex items-center justify-between gap-4 py-3">
                  <div>
                    <p className="font-medium text-slate-900">{tenant.name}</p>
                    <p className="text-sm text-slate-500">
                      {tenant.country?.toUpperCase() ?? 'N/D'} ·{' '}
                      {tenant.agency_id ? 'Via agenzia' : 'Diretto'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400">{formatDate(tenant.created_at)}</p>
                    <div className="mt-1 flex justify-end gap-1">
                      {tenant.is_active ? (
                        <StatusBadge tone="emerald">Attivo</StatusBadge>
                      ) : (
                        <StatusBadge tone="amber">Inattivo</StatusBadge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard
        title="Gerarchia dei permessi"
        description="Piattaforma → Agenzia → Cliente → Attività → Prenotazione."
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {[
            ['Piattaforma', 'Solo amministratori'],
            ['Agenzia', 'Gestisce più clienti'],
            ['Cliente', 'Titolare attività'],
            ['Attività', 'Struttura o servizio'],
            ['Prenotazione', 'Singolo booking'],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{label}</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Clienti con più attività" description="Chi ha più strutture/servizi configurati.">
        {topTenantsByEntities.length === 0 ? (
          <p className="text-sm text-slate-500">Nessun dato disponibile.</p>
        ) : (
          <div className="divide-y divide-slate-200">
            {topTenantsByEntities.map((tenant) => (
              <div key={tenant.id} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">{tenant.name}</p>
                </div>
                <StatusBadge tone={tenant.entityCount > 0 ? 'emerald' : 'slate'}>
                  {tenant.entityCount} attività
                </StatusBadge>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  )
}
