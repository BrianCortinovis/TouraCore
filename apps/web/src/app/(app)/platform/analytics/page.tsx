import { createServerSupabaseClient } from '@touracore/db/server'
import { LineChart, ExternalLink } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AnalyticsPage() {
  const supabase = await createServerSupabaseClient()

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [eventsRes, settingsRes, sessionsRes, vitalsRes] = await Promise.all([
    supabase
      .from('analytics_events')
      .select('event_name, event_category, created_at, tenant_slug, page_path, properties', { count: 'exact' })
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(100),
    supabase.from('seo_settings').select('ga4_measurement_id, ga4_enabled').eq('scope', 'platform').single(),
    supabase
      .from('core_web_vitals')
      .select('session_id', { count: 'exact', head: true })
      .gte('created_at', since),
    supabase
      .from('core_web_vitals')
      .select('route, metric_name, metric_value, rating, created_at')
      .gte('created_at', since)
      .limit(1000),
  ])

  const events = eventsRes.data ?? []
  const totalEvents = eventsRes.count ?? 0
  const settings = settingsRes.data
  const sessions = sessionsRes.count ?? 0
  const vitals = vitalsRes.data ?? []

  // Aggregate per category
  const byCategory = events.reduce((acc, e) => {
    acc[e.event_category] = (acc[e.event_category] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Top routes from vitals (proxy for page views since we don't yet send page_view events)
  const routeCounts: Record<string, number> = {}
  for (const v of vitals) {
    routeCounts[v.route] = (routeCounts[v.route] ?? 0) + 1
  }
  const topRoutes = Object.entries(routeCounts).sort((a, b) => b[1] - a[1]).slice(0, 10)

  return (
    <div className="space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <LineChart className="h-6 w-6 text-blue-600" />
          Analytics
        </h1>
        <p className="mt-1 text-sm text-gray-500">Eventi business custom + Web Vitals (ultimi 30gg)</p>
      </header>

      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">Stato tracking</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Card label="Vercel Analytics" value="Attivo" hint="Page views via @vercel/analytics" tone="green" />
          <Card label="GA4" value={settings?.ga4_enabled ? 'Attivo' : 'Spento'} hint={settings?.ga4_measurement_id ?? 'Non configurato'} tone={settings?.ga4_enabled ? 'green' : 'gray'} />
          <Card label="Eventi DB custom" value="Attivo" hint="analytics_events table" tone="green" />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">Volume (30gg)</h2>
        <div className="grid gap-4 sm:grid-cols-4">
          <Card label="Eventi business" value={totalEvents.toLocaleString('it-IT')} />
          <Card label="Sessioni Vitals" value={sessions.toLocaleString('it-IT')} />
          <Card label="Categoria top" value={Object.entries(byCategory).sort((a,b)=>b[1]-a[1])[0]?.[0] ?? '—'} hint={`${Object.entries(byCategory).sort((a,b)=>b[1]-a[1])[0]?.[1] ?? 0} eventi`} />
          <Card label="Categorie distinte" value={String(Object.keys(byCategory).length)} />
        </div>
      </section>

      {topRoutes.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">Top pagine (proxy via Web Vitals)</h2>
          <div className="overflow-x-auto rounded-md border border-gray-200">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Route</th>
                  <th className="px-4 py-2 text-right font-medium">Visite</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {topRoutes.map(([route, n]) => (
                  <tr key={route}>
                    <td className="px-4 py-2 font-mono text-xs">{route}</td>
                    <td className="px-4 py-2 text-right">{n}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">Ultimi eventi business</h2>
        {events.length > 0 ? (
          <div className="overflow-x-auto rounded-md border border-gray-200">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Quando</th>
                  <th className="px-3 py-2 text-left font-medium">Categoria</th>
                  <th className="px-3 py-2 text-left font-medium">Evento</th>
                  <th className="px-3 py-2 text-left font-medium">Tenant</th>
                  <th className="px-3 py-2 text-left font-medium">Path</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {events.slice(0, 50).map((e, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2 text-xs text-gray-500">{new Date(e.created_at).toLocaleString('it-IT')}</td>
                    <td className="px-3 py-2 text-xs"><CategoryBadge category={e.event_category} /></td>
                    <td className="px-3 py-2 font-mono text-xs">{e.event_name}</td>
                    <td className="px-3 py-2 text-xs">{e.tenant_slug ?? '—'}</td>
                    <td className="px-3 py-2 text-xs text-gray-600 max-w-xs truncate">{e.page_path ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
            <p className="text-sm text-gray-600">Nessun evento ancora. Inizia a tracciare via <code className="bg-white px-1 rounded">POST /api/analytics/track</code></p>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">Strumenti esterni</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <a href="https://vercel.com/dashboard/analytics" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between rounded-md border border-gray-200 bg-white p-3 hover:border-blue-400">
            <div>
              <h3 className="font-medium">Vercel Analytics</h3>
              <p className="text-xs text-gray-500">Page views & top pages</p>
            </div>
            <ExternalLink className="h-4 w-4 text-gray-400" />
          </a>
          <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between rounded-md border border-gray-200 bg-white p-3 hover:border-blue-400">
            <div>
              <h3 className="font-medium">Search Console</h3>
              <p className="text-xs text-gray-500">Keyword & CTR Google</p>
            </div>
            <ExternalLink className="h-4 w-4 text-gray-400" />
          </a>
          <a href={settings?.ga4_measurement_id ? `https://analytics.google.com/analytics/web/#/p${settings.ga4_measurement_id}/reports/intelligenthome` : 'https://analytics.google.com'} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between rounded-md border border-gray-200 bg-white p-3 hover:border-blue-400">
            <div>
              <h3 className="font-medium">Google Analytics 4</h3>
              <p className="text-xs text-gray-500">{settings?.ga4_enabled ? 'Apri property' : 'Configura in Impostazioni SEO'}</p>
            </div>
            <ExternalLink className="h-4 w-4 text-gray-400" />
          </a>
        </div>
      </section>
    </div>
  )
}

function Card({ label, value, hint, tone = 'gray' }: { label: string; value: string; hint?: string; tone?: 'gray' | 'green' | 'red' }) {
  const cls = tone === 'green' ? 'border-green-200 bg-green-50' : tone === 'red' ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'
  return (
    <div className={`rounded-lg border p-4 ${cls}`}>
      <p className="text-xs font-medium uppercase tracking-wider text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  )
}

function CategoryBadge({ category }: { category: string }) {
  const colors: Record<string, string> = {
    page_view: 'bg-blue-100 text-blue-700',
    booking_funnel: 'bg-purple-100 text-purple-700',
    conversion: 'bg-green-100 text-green-700',
    engagement: 'bg-amber-100 text-amber-700',
    technical: 'bg-gray-100 text-gray-700',
    error: 'bg-red-100 text-red-700',
  }
  return <span className={`inline-block rounded px-2 py-0.5 text-xs ${colors[category] ?? 'bg-gray-100'}`}>{category}</span>
}
