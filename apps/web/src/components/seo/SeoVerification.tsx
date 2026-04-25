import { createPublicClient } from '@/lib/supabase-public'

export async function SeoVerification() {
  const supabase = createPublicClient()
  const { data } = await supabase
    .from('seo_settings')
    .select('google_site_verification, bing_site_verification, custom_head_tags')
    .eq('scope', 'platform')
    .maybeSingle()

  if (!data) return null

  return (
    <>
      {data.google_site_verification && (
        <meta name="google-site-verification" content={data.google_site_verification} />
      )}
      {data.bing_site_verification && (
        <meta name="msvalidate.01" content={data.bing_site_verification} />
      )}
      {data.custom_head_tags && (
        <span dangerouslySetInnerHTML={{ __html: data.custom_head_tags }} />
      )}
    </>
  )
}
