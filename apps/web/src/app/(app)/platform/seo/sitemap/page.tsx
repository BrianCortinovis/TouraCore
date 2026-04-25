import { Map, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { SeoTabs } from '../seo-tabs'
import { RevalidateButton } from './revalidate-button'
import { getSiteBaseUrl } from '@/lib/site-url'

export const dynamic = 'force-dynamic'

const SITEMAPS = [
  { name: 'sitemap_index.xml', label: 'Indice principale', desc: 'Indice di tutti i sub-sitemap' },
  { name: 'sitemap.xml', label: 'Sitemap (alias)', desc: 'Alias di sitemap_index per compatibilità Search Console' },
  { name: 'sitemap-listings.xml', label: 'Listings pubblici', desc: 'Tutte le schede /s/{tenant}/{entity}' },
  { name: 'sitemap-pages.xml', label: 'Pagine generali', desc: 'Home, /discover, /portali' },
  { name: 'sitemap-legal.xml', label: 'Legal', desc: '/legal/privacy, /legal/terms, /legal/cookies' },
  { name: 'sitemap-agencies.xml', label: 'Agenzie', desc: 'Pagine /a/{slug} pubbliche' },
]

const SEARCH_CONSOLE_URL = 'https://search.google.com/search-console/sitemaps'
const BING_WEBMASTER_URL = 'https://www.bing.com/webmasters/sitemaps'

export default async function SitemapPage() {
  const base = getSiteBaseUrl()

  return (
    <div className="space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Map className="h-6 w-6 text-blue-600" />
          Sitemap
        </h1>
        <p className="mt-1 text-sm text-gray-500">Stato sitemap auto-generate e azioni di revalidate</p>
      </header>

      <SeoTabs />

      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">Sitemap disponibili</h2>
        <div className="space-y-2">
          {SITEMAPS.map((s) => (
            <div key={s.name} className="flex items-center justify-between rounded-md border border-gray-200 bg-white p-3">
              <div>
                <Link href={`/${s.name}`} target="_blank" className="font-medium text-blue-600 hover:underline">
                  /{s.name}
                </Link>
                <p className="text-xs text-gray-500">{s.label} — {s.desc}</p>
              </div>
              <Link href={`/${s.name}`} target="_blank" className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1">
                <ExternalLink className="h-4 w-4" /> Apri
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">Revalidate cache</h2>
        <p className="text-sm text-gray-600 mb-3">
          Forza la rigenerazione di sitemap/listings/discover quando cambi contenuti senza aspettare l&apos;ISR
          ({base}/api/revalidate richiede CRON_SECRET).
        </p>
        <RevalidateButton />
      </section>

      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">Submit ai motori di ricerca</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <a
            href={`${SEARCH_CONSOLE_URL}?resource_id=${encodeURIComponent(base)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-md border border-gray-200 bg-white p-3 hover:border-blue-400"
          >
            <div>
              <h3 className="font-medium">Google Search Console</h3>
              <p className="text-xs text-gray-500">Submit & monitor sitemap su Google</p>
            </div>
            <ExternalLink className="h-4 w-4 text-gray-400" />
          </a>
          <a
            href={BING_WEBMASTER_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-md border border-gray-200 bg-white p-3 hover:border-blue-400"
          >
            <div>
              <h3 className="font-medium">Bing Webmaster</h3>
              <p className="text-xs text-gray-500">Submit & monitor sitemap su Bing</p>
            </div>
            <ExternalLink className="h-4 w-4 text-gray-400" />
          </a>
        </div>
      </section>
    </div>
  )
}
