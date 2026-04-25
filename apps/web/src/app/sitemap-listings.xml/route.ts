import { listAllPublicListingsCached } from '@/lib/listings-cache'
import { getSiteBaseUrl } from '@/lib/site-url'

export const revalidate = 3600

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export async function GET() {
  const listings = await listAllPublicListingsCached(5000)
  const baseUrl = getSiteBaseUrl()

  const urls = listings
    .map((l) => {
      const loc = escapeXml(`${baseUrl}/s/${l.tenant_slug}/${l.slug}`)
      const lastmod = l.updated_at ? new Date(l.updated_at).toISOString() : new Date().toISOString()
      return `  <url><loc>${loc}</loc><lastmod>${lastmod}</lastmod><changefreq>daily</changefreq><priority>0.8</priority></url>`
    })
    .join('\n')

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`

  return new Response(body, {
    status: 200,
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 's-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
