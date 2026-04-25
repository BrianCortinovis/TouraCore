import { createServerSupabaseClient } from '@touracore/db/server'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { SeoTabs } from './seo-tabs'

export const dynamic = 'force-dynamic'

export default async function SeoOverviewPage() {
  const supabase = await createServerSupabaseClient()

  const [vitalsRes, problemsRes, listingsRes, redirectsRes, errors404Res, settingsRes] = await Promise.all([
    supabase.from('platform_seo_kpi_daily').select('*').limit(30),
    supabase.from('platform_seo_routes_problems').select('*').limit(10),
    supabase.from('public_listings').select('id', { count: 'exact', head: true }).eq('is_public', true),
    supabase.from('platform_redirects').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('platform_404_log').select('id', { count: 'exact', head: true }).eq('resolved', false),
    supabase.from('seo_settings').select('*').eq('scope', 'platform').single(),
  ])

  const vitals = vitalsRes.data ?? []
  const problems = problemsRes.data ?? []
  const settings = settingsRes.data

  // Aggregate ultimi 7 giorni
  const last7 = vitals.slice(0, 7)
  const totalSamplesLcp = last7.reduce((s, d) => s + (d.lcp_good ?? 0) + (d.lcp_meh ?? 0) + (d.lcp_poor ?? 0), 0)
  const goodLcp = last7.reduce((s, d) => s + (d.lcp_good ?? 0), 0)
  const lcpScore = totalSamplesLcp > 0 ? Math.round((goodLcp / totalSamplesLcp) * 100) : null

  const totalSamplesCls = last7.reduce((s, d) => s + (d.cls_good ?? 0) + (d.cls_poor ?? 0), 0)
  const goodCls = last7.reduce((s, d) => s + (d.cls_good ?? 0), 0)
  const clsScore = totalSamplesCls > 0 ? Math.round((goodCls / totalSamplesCls) * 100) : null

  const totalSamplesInp = last7.reduce((s, d) => s + (d.inp_good ?? 0) + (d.inp_poor ?? 0), 0)
  const goodInp = last7.reduce((s, d) => s + (d.inp_good ?? 0), 0)
  const inpScore = totalSamplesInp > 0 ? Math.round((goodInp / totalSamplesInp) * 100) : null

  const sessions7d = last7.reduce((s, d) => s + (d.sessions ?? 0), 0)

  return (
    <div className="space-y-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Search className="h-6 w-6 text-blue-600" />
            SEO
          </h1>
          <p className="mt-1 text-sm text-gray-500">Web Vitals, listings, sitemap, redirect e impostazioni SEO globali</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/sitemap_index.xml" target="_blank" className="text-sm rounded-md border border-gray-300 px-3 py-2 hover:bg-gray-50">
            Apri sitemap
          </Link>
          <Link href="/robots.txt" target="_blank" className="text-sm rounded-md border border-gray-300 px-3 py-2 hover:bg-gray-50">
            Apri robots.txt
          </Link>
        </div>
      </header>

      <SeoTabs />

      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">Core Web Vitals (ultimi 7gg)</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Sessioni" value={sessions7d.toLocaleString('it-IT')} hint="visite uniche tracciate" />
          <KpiCard label="LCP good %" value={lcpScore !== null ? `${lcpScore}%` : '—'} hint={`${totalSamplesLcp} samples`} good={lcpScore !== null && lcpScore >= 75} />
          <KpiCard label="CLS good %" value={clsScore !== null ? `${clsScore}%` : '—'} hint={`${totalSamplesCls} samples`} good={clsScore !== null && clsScore >= 75} />
          <KpiCard label="INP good %" value={inpScore !== null ? `${inpScore}%` : '—'} hint={`${totalSamplesInp} samples`} good={inpScore !== null && inpScore >= 75} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">Stato sistema</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Listings pubblicati" value={String(listingsRes.count ?? 0)} hint="is_public=true" />
          <KpiCard label="Redirect attivi" value={String(redirectsRes.count ?? 0)} hint="301/302/307/308" />
          <KpiCard label="404 non risolti" value={String(errors404Res.count ?? 0)} hint="ultimi 30gg" alert={(errors404Res.count ?? 0) > 0} />
          <KpiCard label="GA4" value={settings?.ga4_enabled ? 'Attivo' : 'Spento'} hint={settings?.ga4_measurement_id ? settings.ga4_measurement_id : 'Non configurato'} good={settings?.ga4_enabled === true} />
        </div>
      </section>

      {problems.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">Pagine con LCP poor (ultimi 7gg)</h2>
          <div className="overflow-x-auto rounded-md border border-gray-200">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-700">Route</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-700">Samples</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-700">LCP avg</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-700">LCP p75</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-700">Poor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {problems.map((p) => (
                  <tr key={p.route}>
                    <td className="px-4 py-2 font-mono text-xs text-gray-700">{p.route}</td>
                    <td className="px-4 py-2 text-right">{p.samples}</td>
                    <td className="px-4 py-2 text-right">{p.avg_lcp ? `${p.avg_lcp}ms` : '—'}</td>
                    <td className="px-4 py-2 text-right">{p.p75_lcp ? `${p.p75_lcp}ms` : '—'}</td>
                    <td className="px-4 py-2 text-right text-red-600">{p.poor_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}

function KpiCard({ label, value, hint, good, alert }: { label: string; value: string; hint?: string; good?: boolean; alert?: boolean }) {
  const tone = alert ? 'border-red-200 bg-red-50' : good ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'
  return (
    <div className={`rounded-lg border p-4 ${tone}`}>
      <p className="text-xs font-medium uppercase tracking-wider text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  )
}

