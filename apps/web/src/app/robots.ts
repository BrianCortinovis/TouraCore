import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/s/', '/portal/', '/portali/', '/book/', '/property/', '/'],
        disallow: ['/api/', '/account/', '/dashboard/', '/(app)/', '/(dashboard)/', '/superadmin-login'],
      },
    ],
    sitemap: `${baseUrl}/sitemap-listings.xml`,
  }
}
