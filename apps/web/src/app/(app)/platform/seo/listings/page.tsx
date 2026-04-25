import { createServerSupabaseClient } from '@touracore/db/server'
import Link from 'next/link'
import { ListChecks, ExternalLink } from 'lucide-react'
import { SeoTabs } from '../seo-tabs'
import { ListingSeoEditor } from './listing-seo-editor'

export const dynamic = 'force-dynamic'

export default async function ListingsSeoPage() {
  const supabase = await createServerSupabaseClient()

  const { data: listings } = await supabase
    .from('public_listings_view')
    .select('listing_id, tenant_slug, slug, entity_name, entity_kind, seo_title, seo_description, og_image_url')
    .order('tenant_slug')
    .order('slug')

  const rows = listings ?? []

  return (
    <div className="space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <ListChecks className="h-6 w-6 text-blue-600" />
          Listings SEO
        </h1>
        <p className="mt-1 text-sm text-gray-500">Override seo_title, seo_description e og_image per ogni scheda pubblica</p>
      </header>

      <SeoTabs />

      <div className="overflow-x-auto rounded-md border border-gray-200">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-gray-700">Tenant</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700">Listing</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700">SEO title</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700">SEO description</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700">OG image</th>
              <th className="px-3 py-2 text-right font-medium text-gray-700">Azioni</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {rows.map((r) => (
              <tr key={r.listing_id}>
                <td className="px-3 py-2 text-xs font-mono text-gray-600">{r.tenant_slug}</td>
                <td className="px-3 py-2">
                  <div className="font-medium text-gray-900">{r.entity_name}</div>
                  <div className="text-xs text-gray-500">/{r.tenant_slug}/{r.slug} · {r.entity_kind}</div>
                </td>
                <td className="px-3 py-2 max-w-xs truncate text-xs text-gray-700">
                  {r.seo_title ? (
                    <span title={r.seo_title}>{r.seo_title}</span>
                  ) : (
                    <span className="text-gray-400 italic">auto-generato</span>
                  )}
                </td>
                <td className="px-3 py-2 max-w-md truncate text-xs text-gray-700">
                  {r.seo_description ? (
                    <span title={r.seo_description}>{r.seo_description}</span>
                  ) : (
                    <span className="text-gray-400 italic">auto-generato</span>
                  )}
                </td>
                <td className="px-3 py-2 text-xs">
                  {r.og_image_url ? <span className="text-green-600">✓ custom</span> : <span className="text-gray-400">default</span>}
                </td>
                <td className="px-3 py-2 text-right space-x-2">
                  <Link
                    href={`/s/${r.tenant_slug}/${r.slug}`}
                    target="_blank"
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" /> Apri
                  </Link>
                  <ListingSeoEditor
                    listingId={r.listing_id}
                    initialTitle={r.seo_title ?? ''}
                    initialDescription={r.seo_description ?? ''}
                    initialOgImage={r.og_image_url ?? ''}
                    entityName={r.entity_name}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length === 0 && <p className="text-sm text-gray-500">Nessun listing pubblicato.</p>}
    </div>
  )
}
