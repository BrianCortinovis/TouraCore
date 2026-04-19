import { buildOrganizationLd, buildWebsiteLd } from '@touracore/seo'
import { BRAND_CONFIG } from '@/config/brand'
import { getSiteBaseUrl } from '@/lib/site-url'

export function GlobalSchemaLd() {
  const base = getSiteBaseUrl()

  const org = buildOrganizationLd({
    name: BRAND_CONFIG.brand,
    url: base,
    logo: `${base}/logo.svg`,
    description: 'Piattaforma SaaS multi-verticale per turismo: hospitality, ristorazione, noleggio bici, esperienze.',
    contactPoint: {
      email: BRAND_CONFIG.contact_email,
      contactType: 'customer support',
    },
  })

  const website = buildWebsiteLd({
    name: BRAND_CONFIG.brand,
    url: base,
    searchUrlTemplate: `${base}/discover?q={search_term_string}`,
  })

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(org) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(website) }}
      />
    </>
  )
}
