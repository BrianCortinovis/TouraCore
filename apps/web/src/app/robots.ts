import type { MetadataRoute } from 'next'
import { getSiteBaseUrl } from '@/lib/site-url'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getSiteBaseUrl()
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/s/', '/u/', '/discover', '/portal/', '/portali/', '/book/', '/property/', '/legal/', '/'],
        disallow: ['/api/', '/account/', '/dashboard/', '/(app)/', '/(dashboard)/', '/superadmin-login'],
      },
    ],
    sitemap: `${baseUrl}/sitemap_index.xml`,
  }
}
