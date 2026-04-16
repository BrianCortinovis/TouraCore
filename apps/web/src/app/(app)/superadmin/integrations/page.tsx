import { createServiceRoleClient } from '@touracore/db/server'
import { ArrowUpRight, Cable, Network, RadioTower, RefreshCw } from 'lucide-react'
import { MetricCard, SectionCard, StatusBadge, TrendList } from '../_components'
import { buildMonthBuckets, fillBucketsFromRows, formatDate, formatNumber } from '../_lib'

interface IntegrationRow {
  provider: string
  scope: string
  status: 'not_configured' | 'configured' | 'error'
  created_at: string
}

interface ChannelConnectionRow {
  channel_name: string
  is_active: boolean | null
  last_sync_status: string | null
  last_sync_at: string | null
  created_at: string
}

interface SyncLogRow {
  status: 'success' | 'partial' | 'error'
  direction: 'inbound' | 'outbound'
  synced_at: string
  sync_type: string
  entity_id: string
}

export default async function SuperadminIntegrationsPage() {
  const supabase = await createServiceRoleClient()
  const monthBuckets = buildMonthBuckets(6)
  const since = new Date(`${monthBuckets[0]!.key}-01T00:00:00.000Z`).toISOString()

  const [
    { data: credentials },
    { data: connections },
    { data: syncLogs },
  ] = await Promise.all([
    supabase
      .from('integration_credentials')
      .select('provider, scope, status, created_at')
      .order('created_at', { ascending: false }),
    supabase
      .from('channel_connections')
      .select('channel_name, is_active, last_sync_status, last_sync_at, created_at')
      .order('created_at', { ascending: false }),
    supabase
      .from('channel_sync_logs')
      .select('status, direction, synced_at, sync_type, entity_id')
      .gte('synced_at', since)
      .order('synced_at', { ascending: true }),
  ])

  const credentialRows = (credentials ?? []) as IntegrationRow[]
  const connectionRows = (connections ?? []) as ChannelConnectionRow[]
  const syncRows = (syncLogs ?? []) as SyncLogRow[]

  const providerCounts = new Map<string, number>()
  const scopeCounts = new Map<string, number>()
  const credentialStatusCounts = new Map<string, number>()
  for (const row of credentialRows) {
    providerCounts.set(row.provider, (providerCounts.get(row.provider) ?? 0) + 1)
    scopeCounts.set(row.scope, (scopeCounts.get(row.scope) ?? 0) + 1)
    credentialStatusCounts.set(row.status, (credentialStatusCounts.get(row.status) ?? 0) + 1)
  }

  const channelCounts = new Map<string, number>()
  const syncStatusCounts = new Map<string, number>()
  const syncDirectionCounts = new Map<string, number>()
  for (const row of syncRows) {
    syncStatusCounts.set(row.status, (syncStatusCounts.get(row.status) ?? 0) + 1)
    syncDirectionCounts.set(row.direction, (syncDirectionCounts.get(row.direction) ?? 0) + 1)
  }
  for (const row of connectionRows) {
    channelCounts.set(row.channel_name, (channelCounts.get(row.channel_name) ?? 0) + 1)
  }

  const providerSeries = Array.from(providerCounts.entries()).map(([key, value]) => ({ key, label: key, value }))
  const scopeSeries = Array.from(scopeCounts.entries()).map(([key, value]) => ({ key, label: key, value }))
  const syncSeries = Array.from(syncStatusCounts.entries()).map(([key, value]) => ({ key, label: key, value }))
  const topChannels = Array.from(channelCounts.entries())
    .map(([key, value]) => ({ key, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6)
  const syncTrend = fillBucketsFromRows(monthBuckets, syncRows, (row) => row.synced_at)

  const activeConnections = connectionRows.filter((row) => row.is_active).length
  const configuredCredentials = credentialRows.filter((row) => row.status === 'configured').length
  const recentErrorSyncs = syncRows.filter((row) => row.status === 'error').length

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
            <Network className="h-3.5 w-3.5" />
            Integrations
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
            Providers, sync e channel manager
          </h1>
          <p className="max-w-3xl text-sm leading-6 text-slate-500">
            Un’unica vista per credenziali, connessioni canale, stati sync e copertura provider.
            Il layer integrazioni deve essere sempre visibile a livello piattaforma.
          </p>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Configured credentials" value={formatNumber(configuredCredentials)} hint={`${formatNumber(credentialRows.length)} credenziali`} icon={Cable} tone="blue" />
        <MetricCard label="Active connections" value={formatNumber(activeConnections)} hint={`${formatNumber(connectionRows.length)} canali`} icon={RadioTower} tone="emerald" />
        <MetricCard label="Sync errors" value={formatNumber(recentErrorSyncs)} hint="Ultimi 6 mesi" icon={RefreshCw} tone="rose" />
        <MetricCard label="Providers tracked" value={formatNumber(providerSeries.length)} hint="Multi-scope" icon={ArrowUpRight} tone="violet" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <SectionCard title="Provider coverage" description="Distribuzione delle credenziali per provider.">
          <TrendList items={providerSeries} valueLabel="credenziali" barTone="bg-blue-600" />
          <div className="mt-4 flex flex-wrap gap-2">
            {Array.from(credentialStatusCounts.entries()).map(([status, value]) => (
              <StatusBadge key={status} tone={status === 'configured' ? 'emerald' : status === 'error' ? 'rose' : 'amber'}>
                {status}: {value}
              </StatusBadge>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Scope coverage" description="Dove sono salvate le credenziali di integrazione.">
          <TrendList items={scopeSeries} valueLabel="records" barTone="bg-violet-600" />
          <div className="mt-4 flex flex-wrap gap-2">
            {Array.from(syncDirectionCounts.entries()).map(([direction, value]) => (
              <StatusBadge key={direction} tone={direction === 'outbound' ? 'blue' : 'slate'}>
                {direction}: {value}
              </StatusBadge>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <SectionCard title="Sync health" description="Esito dei channel sync nel tempo.">
          <TrendList items={syncTrend} valueLabel="sync" barTone="bg-emerald-600" />
          <div className="mt-4 flex flex-wrap gap-2">
            {syncSeries.map((item) => (
              <StatusBadge key={item.key} tone={item.key === 'success' ? 'emerald' : item.key === 'partial' ? 'amber' : 'rose'}>
                {item.label}: {item.value}
              </StatusBadge>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Channel connections" description="Connessioni attive e ultimo stato sincronizzato.">
          {topChannels.length > 0 ? (
            <div className="mb-4 flex flex-wrap gap-2">
              {topChannels.map((channel) => (
                <StatusBadge key={channel.key} tone="slate">
                  {channel.key}: {channel.value}
                </StatusBadge>
              ))}
            </div>
          ) : null}
          {connectionRows.length === 0 ? (
            <p className="text-sm text-slate-500">Nessuna connessione canale.</p>
          ) : (
            <div className="space-y-3">
              {connectionRows.slice(0, 8).map((row) => (
                <div key={`${row.channel_name}-${row.created_at}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{row.channel_name}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {row.last_sync_at ? formatDate(row.last_sync_at) : 'never synced'}
                      </p>
                    </div>
                    <StatusBadge tone={row.is_active ? 'emerald' : 'slate'}>
                      {row.is_active ? 'active' : 'inactive'}
                    </StatusBadge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <StatusBadge tone={row.last_sync_status === 'success' ? 'emerald' : row.last_sync_status === 'partial' ? 'amber' : 'rose'}>
                      {row.last_sync_status ?? 'no sync'}
                    </StatusBadge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Recent sync log" description="Ultimi eventi di sincronizzazione.">
        {syncRows.length === 0 ? (
          <p className="text-sm text-slate-500">Nessun sync log recente.</p>
        ) : (
          <div className="divide-y divide-slate-200">
            {syncRows.slice(-12).reverse().map((row, index) => (
              <div key={`${row.entity_id}-${index}`} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {row.sync_type}
                    <span className="font-normal text-slate-500"> · {row.direction}</span>
                  </p>
                  <p className="mt-1 text-xs text-slate-400">entity {row.entity_id.slice(0, 8)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge tone={row.status === 'success' ? 'emerald' : row.status === 'partial' ? 'amber' : 'rose'}>
                    {row.status}
                  </StatusBadge>
                  <span className="text-xs text-slate-400">{formatDate(row.synced_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  )
}
