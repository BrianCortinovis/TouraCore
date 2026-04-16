import { createServiceRoleClient } from '@touracore/db/server'
import { AlertTriangle, Cable, Shield, ShieldCheck, ShieldX, TimerReset } from 'lucide-react'
import { MetricCard, SectionCard, StatusBadge, TrendList } from '../_components'
import { buildMonthBuckets, fillBucketsFromRows, formatDate, formatNumber } from '../_lib'

interface AuditLogRow {
  id: string
  action: string
  entity_type: string
  created_at: string
  user_id: string | null
}

function isSensitiveLog(action: string, entityType: string) {
  const value = `${action} ${entityType}`.toLowerCase()
  return (
    value.includes('delete') ||
    value.includes('remove') ||
    value.includes('integration') ||
    value.includes('subscription') ||
    value.includes('platform_admin') ||
    value.includes('connect') ||
    value.includes('channel')
  )
}

export default async function SuperadminSecurityPage() {
  const supabase = await createServiceRoleClient()
  const monthBuckets = buildMonthBuckets(6)
  const since = new Date(`${monthBuckets[0]!.key}-01T00:00:00.000Z`).toISOString()
  const last7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { count: adminCount },
    { count: auditCount },
    { count: recentAuditCount },
    { count: integrationCount },
    { count: configuredIntegrationCount },
    { count: activeChannelCount },
    { data: recentLogs },
    { data: recent7dLogs },
    { data: auditRows },
  ] = await Promise.all([
    supabase.from('platform_admins').select('id', { count: 'exact', head: true }),
    supabase.from('audit_logs').select('id', { count: 'exact', head: true }),
    supabase.from('audit_logs').select('id', { count: 'exact', head: true }).gte('created_at', last7d),
    supabase.from('integration_credentials').select('id', { count: 'exact', head: true }),
    supabase
      .from('integration_credentials')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'configured'),
    supabase
      .from('channel_connections')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true),
    supabase
      .from('audit_logs')
      .select('id, action, entity_type, created_at, user_id')
      .order('created_at', { ascending: false })
      .limit(12),
    supabase
      .from('audit_logs')
      .select('id, action, entity_type, created_at, user_id')
      .gte('created_at', last7d)
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('audit_logs')
      .select('created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: true }),
  ])

  const securityTimeline = fillBucketsFromRows(
    monthBuckets,
    (auditRows ?? []) as { created_at: string }[],
    (row) => row.created_at,
  )
  const recentHighRiskCount = (recent7dLogs ?? []).filter((log) => isSensitiveLog(log.action, log.entity_type)).length

  const isolationLayers = [
    {
      layer: 'Platform',
      scope: 'superadmin only',
      guard: 'platform_admins + service role',
      data: 'billing, deploy, settings globali',
    },
    {
      layer: 'Agency',
      scope: 'agency_id',
      guard: 'agency_membership + tenant links',
      data: 'clienti, tenant assegnati, log di agenzia',
    },
    {
      layer: 'Tenant',
      scope: 'tenant_id',
      guard: 'RLS + auth bootstrap',
      data: 'fatture, abbonamenti, staff, settings',
    },
    {
      layer: 'Entity',
      scope: 'entity_id',
      guard: 'entity scoped queries + policies',
      data: 'camere, prenotazioni, servizi, canali',
    },
    {
      layer: 'Booking session',
      scope: 'temporary',
      guard: 'server-side validation',
      data: 'checkout, extras, payment, confirm',
    },
  ]

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700">
              <Shield className="h-3.5 w-3.5" />
              Security command
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
              Security tracking & tenant isolation
            </h1>
            <p className="max-w-3xl text-sm leading-6 text-slate-500">
              Audit, scope, credenziali e separazione dei livelli della suite. Qui si vede subito
              se qualcosa esce dal perimetro giusto.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <StatusBadge tone={configuredIntegrationCount ? 'emerald' : 'amber'}>
              {configuredIntegrationCount ? 'Integrations scoped' : 'Integrations review'}
            </StatusBadge>
            <StatusBadge tone={activeChannelCount ? 'emerald' : 'rose'}>
              {activeChannelCount ? 'Channel sync active' : 'Channel sync down'}
            </StatusBadge>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Audit logs" value={formatNumber(auditCount ?? 0)} hint="Registro completo" icon={ShieldCheck} tone="blue" />
        <MetricCard label="Last 7d audit" value={formatNumber(recentAuditCount ?? 0)} hint="Attività recente" icon={TimerReset} tone="violet" />
        <MetricCard label="High risk ops" value={formatNumber(recentHighRiskCount ?? 0)} hint="Delete / integration / admin" icon={AlertTriangle} tone="amber" />
        <MetricCard label="Integration creds" value={formatNumber(integrationCount ?? 0)} hint="Scope credenziali" icon={Cable} tone="blue" />
        <MetricCard label="Platform admins" value={formatNumber(adminCount ?? 0)} hint="Accesso livello piattaforma" icon={ShieldX} tone="rose" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard title="Security trend" description="Volume audit degli ultimi mesi.">
          <TrendList items={securityTimeline} valueLabel="eventi di audit" barTone="bg-rose-600" />
        </SectionCard>

        <SectionCard title="Threat signals" description="Ultimi segnali ad alto impatto." >
          {(!recentLogs || recentLogs.length === 0) ? (
            <p className="text-sm text-slate-500">Nessun evento recente.</p>
          ) : (
            <div className="space-y-3">
              {(recentLogs as AuditLogRow[]).map((log) => {
                const sensitive = isSensitiveLog(log.action, log.entity_type)
                return (
                  <div key={log.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {log.action}
                          <span className="font-normal text-slate-500"> · {log.entity_type}</span>
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          user {log.user_id ? log.user_id.slice(0, 8) : 'system'}
                        </p>
                      </div>
                      <StatusBadge tone={sensitive ? 'amber' : 'emerald'}>
                        {sensitive ? 'high risk' : 'ok'}
                      </StatusBadge>
                    </div>
                    <p className="mt-2 text-xs text-slate-400">{formatDate(log.created_at)}</p>
                  </div>
                )
              })}
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard
        title="Isolation matrix"
        description="La suite funziona solo se i layer sono separati con scope e policy chiari."
      >
        <div className="grid gap-3 xl:grid-cols-5">
          {isolationLayers.map((layer) => (
            <div key={layer.layer} className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{layer.layer}</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{layer.scope}</p>
              <p className="mt-1 text-xs text-slate-500">{layer.guard}</p>
              <p className="mt-2 text-xs text-slate-400">{layer.data}</p>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}
