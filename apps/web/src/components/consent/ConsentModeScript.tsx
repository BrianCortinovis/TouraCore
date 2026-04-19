import Script from 'next/script'
import { buildGtagDefaultScript } from '@touracore/compliance'

export function ConsentModeScript() {
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID

  return (
    <>
      <Script
        id="consent-default"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{ __html: buildGtagDefaultScript() }}
      />
      {gaId && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
            strategy="afterInteractive"
          />
          <Script
            id="ga-config"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `gtag('js', new Date()); gtag('config', '${gaId}', { anonymize_ip: true });`,
            }}
          />
        </>
      )}
    </>
  )
}
