import Script from 'next/script'
import { createPublicClient } from '@/lib/supabase-public'

export async function GoogleAnalytics() {
  const supabase = createPublicClient()
  const { data } = await supabase
    .from('seo_settings')
    .select('ga4_measurement_id, ga4_enabled')
    .eq('scope', 'platform')
    .maybeSingle()

  if (!data?.ga4_enabled || !data.ga4_measurement_id) {
    return null
  }

  const id = data.ga4_measurement_id

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${id}`} strategy="afterInteractive" />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());

          // Consent Mode v2 default = denied (rispetta GDPR)
          gtag('consent', 'default', {
            'ad_storage': 'denied',
            'analytics_storage': 'denied',
            'ad_user_data': 'denied',
            'ad_personalization': 'denied',
            'wait_for_update': 500,
          });

          gtag('config', '${id}', { anonymize_ip: true });
        `}
      </Script>
    </>
  )
}
