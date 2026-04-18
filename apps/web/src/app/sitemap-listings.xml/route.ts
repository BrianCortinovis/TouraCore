import { listAllPublicListings } from '@touracore/listings'
import { createPublicClient } from '@/lib/supabase-public'

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
  const supabase = createPublicClient()
  const listings = await listAllPublicListings(supabase, { limit: 5000 })
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

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
