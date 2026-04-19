import { getPolicyVersion } from '@touracore/compliance'
import { getSiteBaseUrl } from '@/lib/site-url'
import { getAllCanonicalSlugs } from '@/lib/policy-alias'

export const revalidate = 86400

function escapeXml(v: string): string {
  return v
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export async function GET() {
  const base = getSiteBaseUrl()
  const version = getPolicyVersion()
  // policy version hash not a timestamp — use now as lastmod proxy
  const lastmod = new Date().toISOString()

  const urls: string[] = []
  for (const slug of getAllCanonicalSlugs()) {
    const loc = escapeXml(`${base}/legal/${slug}`)
    const altEn = escapeXml(`${base}/legal/${slug}?lang=en`)
    urls.push(
      `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <xhtml:link rel="alternate" hreflang="it" href="${loc}"/>\n    <xhtml:link rel="alternate" hreflang="en" href="${altEn}"/>\n    <priority>0.6</priority>\n  </url>`
    )
  }
  // Sub-processors page
  {
    const loc = escapeXml(`${base}/legal/sub-processors`)
    urls.push(
      `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <priority>0.5</priority>\n  </url>`
    )
  }

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>`

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': `public, max-age=${revalidate}, s-maxage=${revalidate}`,
      'X-Policy-Version': version,
    },
  })
}
