import type { MetadataRoute } from 'next'
import { getSiteBaseUrl } from '@/lib/site-url'

export const revalidate = 300

export default async function robots(): Promise<MetadataRoute.Robots> {
  const baseUrl = getSiteBaseUrl()

  return {
    rules: [
      {
        userAgent: '*',
        // Public-facing routes che vogliamo indicizzare
        allow: ['/s/', '/u/', '/discover', '/portali/', '/book/', '/legal/', '/'],
        // Disallow:
        // - /api/* technical endpoints
        // - /account/, /platform/, /a/, /superadmin* dashboard areas
        // - /r/, /checkin/, /checkout/, /credits/, /gift-card/, /portal/ token-based pages
        // - /preferences/, /onboarding, /register, /login auth flows (no SEO value)
        // - /wiring-proof debug dev page
        // (route group /(app)/ e /(dashboard)/ NON appaiono negli URL pubblici, no Disallow inutile)
        disallow: [
          '/api/',
          '/account/',
          '/platform/',
          '/a/',
          '/superadmin',
          '/superadmin-login',
          '/r/',
          '/checkin/',
          '/checkout/',
          '/credits/',
          '/gift-card/',
          '/portal/',
          '/preferences/',
          '/onboarding',
          '/register',
          '/login',
          '/wiring-proof',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap_index.xml`,
  }
}
