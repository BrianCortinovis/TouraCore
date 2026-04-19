import { getSiteBaseUrl } from '@/lib/site-url'
import { createPublicClient } from '@/lib/supabase-public'

export const revalidate = 3600

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
  const lastmod = new Date().toISOString()

  let agencies: Array<{ slug: string; updated_at: string | null }> = []
  try {
    const supabase = createPublicClient()
    const { data } = await supabase
      .from('agencies')
      .select('slug, updated_at')
      .eq('is_public', true)
      .limit(5000)
    agencies = data ?? []
  } catch {
    // fallback empty
  }

  const urls = agencies
    .map((a) => {
      const loc = escapeXml(`${base}/r/${a.slug}`)
      const mod = a.updated_at ? new Date(a.updated_at).toISOString() : lastmod
      return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${mod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>`
    })
    .join('\n')

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': `public, max-age=${revalidate}, s-maxage=${revalidate}`,
    },
  })
}
