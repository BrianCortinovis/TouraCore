import { createPublicClient } from '@/lib/supabase-public'

/**
 * Sanitize custom_head_tags: lascia solo <meta> e <link> self-closing.
 * Whitelist tag + attributi comuni (name, content, rel, href, property, charset, http-equiv).
 * Blocca javascript:/data:/vbscript: URLs.
 *
 * S035 — mitigation stored XSS site-wide se platform admin compromesso.
 */
function sanitizeHeadTags(raw: string): string {
  if (!raw || typeof raw !== 'string') return ''
  const out: string[] = []
  const tagRegex = /<(meta|link)\s+([^>]*?)\/?\s*>/gi
  let m: RegExpExecArray | null
  while ((m = tagRegex.exec(raw)) !== null) {
    const tag = m[1]?.toLowerCase()
    const attrs = m[2] ?? ''
    const safeAttrs: string[] = []
    const attrRegex = /(name|content|rel|href|property|charset|http-equiv)\s*=\s*"([^"]*)"/gi
    let am: RegExpExecArray | null
    while ((am = attrRegex.exec(attrs)) !== null) {
      const key = am[1]?.toLowerCase()
      const val = am[2] ?? ''
      if (/^\s*(javascript|data|vbscript):/i.test(val)) continue
      safeAttrs.push(`${key}="${val.replace(/"/g, '&quot;')}"`)
    }
    if (safeAttrs.length > 0) {
      out.push(`<${tag} ${safeAttrs.join(' ')} />`)
    }
  }
  return out.join('\n')
}

export async function SeoVerification() {
  const supabase = createPublicClient()
  const { data } = await supabase
    .from('seo_settings')
    .select('google_site_verification, bing_site_verification, custom_head_tags')
    .eq('scope', 'platform')
    .maybeSingle()

  if (!data) return null

  const sanitizedTags = data.custom_head_tags ? sanitizeHeadTags(data.custom_head_tags as string) : ''

  return (
    <>
      {data.google_site_verification && (
        <meta name="google-site-verification" content={data.google_site_verification} />
      )}
      {data.bing_site_verification && (
        <meta name="msvalidate.01" content={data.bing_site_verification} />
      )}
      {sanitizedTags && (
        <span dangerouslySetInnerHTML={{ __html: sanitizedTags }} />
      )}
    </>
  )
}
