import { getSiteBaseUrl } from '@/lib/site-url'

export const revalidate = 86400

const SUB_SITEMAPS = [
  'sitemap-listings.xml',
  'sitemap-legal.xml',
  'sitemap-pages.xml',
  'sitemap-agencies.xml',
]

export async function GET() {
  const base = getSiteBaseUrl()
  const lastmod = new Date().toISOString()

  const entries = SUB_SITEMAPS.map(
    (sm) =>
      `  <sitemap>\n    <loc>${base}/${sm}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </sitemap>`
  ).join('\n')

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</sitemapindex>`

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': `public, max-age=${revalidate}, s-maxage=${revalidate}`,
    },
  })
}
