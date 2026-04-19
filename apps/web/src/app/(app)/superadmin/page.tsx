import { createServiceRoleClient } from '@touracore/db/server'
import {
  Activity,
  Building2,
  Briefcase,
  CreditCard,
  GitBranch,
  Layers3,
  Network,
  Shield,
  Users,
} from 'lucide-react'
import {
  MetricCard,
  QuickLink,
  SectionCard,
  StatusBadge,
  TrendList,
} from './_components'
import {
  buildMonthBuckets,
  fillBucketsFromRows,
  formatDate,
  formatNumber,
} from './_lib'

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

interface AuditLogRow {
  id: string
  action: string
  entity_type: string
  created_at: string
  user_id: string | null
}

interface SimpleRow {
  created_at: string
}

function formatModuleLabel(key: string) {
  return key
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase())
}

export default async function SuperadminOverview() {
  const supabase = await createServiceRoleClient()
  const monthBuckets = buildMonthBuckets(6)
  const since = new Date(`${monthBuckets[0]!.key}-01T00:00:00.000Z`).toISOString()

  const [
    { count: tenantCount },
    { count: entityCount },
    { count: agencyCount },
    { count: staffCount },
    { count: adminCount },
    { count: auditCount },
    { count: integrationCount },
    { count: configuredIntegrationCount },
    { count: channelCount },
    { count: activeChannelCount },
    { count: subscriptionCount },
    { count: activeSubscriptionCount },
    { count: connectAccountCount },
    { count: readyConnectCount },
    { count: invoiceCount },
    { count: reservationCount },
    { count: confirmedReservationCount },
    { count: messageCount },
    { count: syncCount },
    { data: recentTenants },
    { data: recentLogs },
    { data: tenantRows },
    { data: entityRows },
    { data: auditRows },
    { data: reservationRows },
    { data: messageRows },
    { data: syncRows },
    { data: connectRows },
    { data: invoiceRows },
  ] = await Promise.all([
    supabase.from('tenants').select('id', { count: 'exact', head: true }),
    supabase.from('entities').select('id', { count: 'exact', head: true }),
    supabase.from('agencies').select('id', { count: 'exact', head: true }),
    supabase.from('staff_members').select('user_id', { count: 'exact', head: true }),
    supabase.from('platform_admins').select('id', { count: 'exact', head: true }),
    supabase.from('audit_logs').select('id', { count: 'exact', head: true }),
    supabase.from('integration_credentials').select('id', { count: 'exact', head: true }),
    supabase
      .from('integration_credentials')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'configured'),
    supabase.from('channel_connections').select('id', { count: 'exact', head: true }),
    supabase
      .from('channel_connections')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true),
    supabase.from('subscriptions').select('id', { count: 'exact', head: true }),
    supabase
      .from('subscriptions')
      .select('id', { count: 'exact', head: true })
      .in('status', ['active', 'trialing']),
    supabase.from('connect_accounts').select('id', { count: 'exact', head: true }),
    supabase
      .from('connect_accounts')
      .select('id', { count: 'exact', head: true })
      .eq('onboarding_complete', true),
    supabase.from('invoices').select('id', { count: 'exact', head: true }),
    supabase.from('reservations').select('id', { count: 'exact', head: true }),
    supabase
      .from('reservations')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'confirmed'),
    supabase.from('sent_messages').select('id', { count: 'exact', head: true }),
    supabase.from('channel_sync_logs').select('id', { count: 'exact', head: true }),
    supabase
      .from('tenants')
      .select('id, name, slug, country, created_at, modules, agency_id, is_active')
      .order('created_at', { ascending: false })
      .limit(6),
    supabase
      .from('audit_logs')
      .select('id, action, entity_type, created_at, user_id')
      .order('created_at', { ascending: false })
      .limit(8),
    supabase
      .from('tenants')
      .select('created_at, modules')
      .gte('created_at', since)
      .order('created_at', { ascending: true }),
    supabase
      .from('entities')
      .select('created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: true }),
    supabase
      .from('audit_logs')
      .select('created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: true }),
    supabase
      .from('reservations')
      .select('created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: true }),
    supabase
      .from('sent_messages')
      .select('created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: true }),
    supabase
      .from('channel_sync_logs')
      .select('synced_at')
      .gte('synced_at', since)
      .order('synced_at', { ascending: true }),
    supabase
      .from('connect_accounts')
      .select('created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: true }),
    supabase
      .from('invoices')
      .select('created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: true }),
  ])

  const tenantGrowth = fillBucketsFromRows(
    monthBuckets,
    (tenantRows ?? []) as SimpleRow[],
    (row) => row.created_at,
  )

  const suiteActivityRows = [
    ...((auditRows ?? []) as SimpleRow[]),
    ...((reservationRows ?? []) as SimpleRow[]),
    ...((messageRows ?? []) as SimpleRow[]),
    ...((syncRows ?? []) as { synced_at: string }[]).map((row) => ({ created_at: row.synced_at })),
    ...((connectRows ?? []) as SimpleRow[]),
    ...((invoiceRows ?? []) as SimpleRow[]),
  ]

  const suiteActivity = fillBucketsFromRows(monthBuckets, suiteActivityRows, (row) => row.created_at)

  const entityGrowth = fillBucketsFromRows(
    monthBuckets,
    (entityRows ?? []) as SimpleRow[],
    (row) => row.created_at,
  )

  const moduleCounts = new Map<string, number>()
  for (const tenant of (tenantRows ?? []) as TenantRow[]) {
    const modules = tenant.modules ?? {}
    for (const [key, enabled] of Object.entries(modules)) {
      if (!enabled) continue
      moduleCounts.set(key, (moduleCounts.get(key) ?? 0) + 1)
    }
  }

  const topModules = Array.from(moduleCounts.entries())
    .map(([label, value]) => ({ key: label, label: formatModuleLabel(label), value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6)

  const isolationScore = [
    configuredIntegrationCount ? 1 : 0,
    activeChannelCount ? 1 : 0,
    activeSubscriptionCount ? 1 : 0,
    readyConnectCount ? 1 : 0,
  ].reduce((acc, value) => acc + value, 0)

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-700 p-6 text-white shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-white/70">
              Superadmin control room
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Centro di controllo piattaforma
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-white/70 sm:text-base">
                Visibilità unificata su clienti, attività, fatturazione, integrazioni e registri
                della piattaforma. Il nucleo è condiviso ma ogni cliente opera nel proprio spazio
                isolato.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <QuickLink href="/superadmin/security" label="Sicurezza" icon={Shield} />
              <QuickLink href="/superadmin/billing" label="Fatturazione" icon={CreditCard} />
              <QuickLink href="/superadmin/integrations" label="Integrazioni" icon={Network} />
              <QuickLink href="/superadmin/tenancy" label="Clienti" icon={GitBranch} />
              <QuickLink href="/superadmin/architecture" label="Architettura" icon={Layers3} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:w-[28rem]">
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.22em] text-white/50">Isolamento clienti</p>
              <p className="mt-2 text-3xl font-semibold">{isolationScore}/4</p>
              <p className="mt-1 text-sm text-white/70">
                Verifiche base: integrazioni configurate, canali attivi, abbonamenti, pagamenti.
              </p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.22em] text-white/50">Registro eventi</p>
              <p className="mt-2 text-3xl font-semibold">{formatNumber(auditCount ?? 0)}</p>
              <p className="mt-1 text-sm text-white/70">
                Eventi tracciati nel registro immutabile della piattaforma.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Clienti" value={formatNumber(tenantCount ?? 0)} hint="Attività registrate" icon={Building2} tone="blue" />
        <MetricCard label="Strutture" value={formatNumber(entityCount ?? 0)} hint="Attività operative" icon={Activity} tone="violet" />
        <MetricCard label="Agenzie" value={formatNumber(agencyCount ?? 0)} hint="Partner intermedi" icon={Briefcase} tone="amber" />
        <MetricCard label="Collaboratori" value={formatNumber(staffCount ?? 0)} hint="Membri dello staff" icon={Users} tone="emerald" />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <MetricCard
          label="Integrazioni configurate"
          value={formatNumber(configuredIntegrationCount ?? 0)}
          hint={`${formatNumber(integrationCount ?? 0)} credenziali totali`}
          icon={Network}
          tone="blue"
        />
        <MetricCard
          label="Canali collegati"
          value={formatNumber(activeChannelCount ?? 0)}
          hint={`${formatNumber(channelCount ?? 0)} connessioni totali`}
          icon={Layers3}
          tone="violet"
        />
        <MetricCard
          label="Abbonamenti attivi"
          value={formatNumber(activeSubscriptionCount ?? 0)}
          hint={`${formatNumber(subscriptionCount ?? 0)} abbonamenti totali`}
          icon={CreditCard}
          tone="emerald"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard
          title="Volume di attività"
          description="Eventi della piattaforma negli ultimi mesi: registri, prenotazioni, messaggi, sincronizzazioni e fatture."
        >
          <TrendList items={suiteActivity} valueLabel="eventi" barTone="bg-slate-900" />
        </SectionCard>

        <SectionCard
          title="Crescita clienti"
          description="Nuovi clienti registrati e nuove attività aperte nel tempo."
        >
          <div className="space-y-6">
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Clienti
              </p>
              <TrendList items={tenantGrowth} valueLabel="clienti" barTone="bg-blue-600" />
            </div>
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Strutture
              </p>
              <TrendList items={entityGrowth} valueLabel="strutture" barTone="bg-violet-600" />
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <SectionCard
          title="Moduli più usati"
          description="Quanti clienti hanno attivato ciascun modulo verticale o funzione condivisa."
        >
          {topModules.length === 0 ? (
            <p className="text-sm text-slate-500">Nessun modulo attivo ancora.</p>
          ) : (
            <div className="space-y-3">
              {topModules.map((module) => {
                const max = Math.max(1, ...topModules.map((item) => item.value))
                const pct = (module.value / max) * 100
                return (
                  <div key={module.key} className="flex items-center gap-3">
                    <span className="w-36 shrink-0 text-sm font-medium text-slate-600">
                      {module.label}
                    </span>
                    <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full bg-emerald-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-10 shrink-0 text-right text-sm font-semibold text-slate-700">
                      {module.value}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Segnali operativi"
          description="Attività recenti, sicurezza e operazioni gestionali della piattaforma."
        >
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Prenotazioni</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  {formatNumber(reservationCount ?? 0)}
                </p>
                <p className="text-sm text-slate-500">
                  {formatNumber(confirmedReservationCount ?? 0)} confermate
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Messaggi</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  {formatNumber(messageCount ?? 0)}
                </p>
                <p className="text-sm text-slate-500">Inviati o in coda</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Sincronizzazioni</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  {formatNumber(syncCount ?? 0)}
                </p>
                <p className="text-sm text-slate-500">Canali in entrata e uscita</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Account pagamenti</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  {formatNumber(connectAccountCount ?? 0)}
                </p>
                <p className="text-sm text-slate-500">Stripe collegati</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Fatture</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  {formatNumber(invoiceCount ?? 0)}
                </p>
                <p className="text-sm text-slate-500">Registrate</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Amministratori</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  {formatNumber(adminCount ?? 0)}
                </p>
                <p className="text-sm text-slate-500">Accesso piattaforma</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <StatusBadge tone={configuredIntegrationCount ? 'emerald' : 'rose'}>
                {configuredIntegrationCount ? 'Integrazioni attive' : 'Integrazioni mancanti'}
              </StatusBadge>
              <StatusBadge tone={activeChannelCount ? 'emerald' : 'amber'}>
                {activeChannelCount ? 'Canali sincronizzati' : 'Canali inattivi'}
              </StatusBadge>
              <StatusBadge tone={activeSubscriptionCount ? 'emerald' : 'amber'}>
                {activeSubscriptionCount ? 'Abbonamenti ok' : 'Abbonamenti da verificare'}
              </StatusBadge>
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="Ultimi clienti registrati" description="Nuove attività aggiunte di recente.">
          {(!recentTenants || recentTenants.length === 0) ? (
            <p className="text-sm text-slate-500">Nessun cliente registrato.</p>
          ) : (
            <div className="divide-y divide-slate-200">
              {(recentTenants as TenantRow[]).map((tenant) => (
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
                    <p className="mt-1 text-xs text-slate-500">
                      {tenant.is_active ? 'Attivo' : 'Inattivo'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Ultimi audit logs" description="Eventi più recenti del registro immutabile.">
          {(!recentLogs || recentLogs.length === 0) ? (
            <p className="text-sm text-slate-500">Nessun log.</p>
          ) : (
            <div className="divide-y divide-slate-200">
              {(recentLogs as AuditLogRow[]).map((log) => (
                <div key={log.id} className="flex items-start justify-between gap-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {log.action}
                      <span className="font-normal text-slate-500"> su {log.entity_type}</span>
                    </p>
                    <p className="text-xs text-slate-400">
                      user {log.user_id ? log.user_id.slice(0, 8) : 'system'}
                    </p>
                  </div>
                  <span className="text-xs text-slate-400">{formatDate(log.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  )
}
