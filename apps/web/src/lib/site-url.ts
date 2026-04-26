/**
 * Resolve canonical site base URL with sensible fallbacks.
 *
 * Priority:
 * 1. NEXT_PUBLIC_SITE_URL (explicit config)
 * 2. VERCEL_PROJECT_PRODUCTION_URL (Vercel prod deploy)
 * 3. VERCEL_URL (any Vercel deploy, preview or prod)
 * 4. localhost:3000 (dev only) | throw in production
 *
 * In production, mancanza di NEXT_PUBLIC_SITE_URL + VERCEL_URL è errore: i link
 * generati (sitemap, OG, redirect Stripe) finirebbero su localhost.
 */
export function getSiteBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL
  if (explicit) return explicit.replace(/\/$/, '')

  const vercelProd = process.env.VERCEL_PROJECT_PRODUCTION_URL
  if (vercelProd) return `https://${vercelProd}`

  const vercel = process.env.VERCEL_URL
  if (vercel) return `https://${vercel}`

  if (process.env.NODE_ENV === 'production') {
    throw new Error('Site URL not configured: set NEXT_PUBLIC_SITE_URL or rely on Vercel auto-detect')
  }
  return 'http://localhost:3000'
}
