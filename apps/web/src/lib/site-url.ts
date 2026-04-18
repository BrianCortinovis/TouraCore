/**
 * Resolve canonical site base URL with sensible fallbacks.
 *
 * Priority:
 * 1. NEXT_PUBLIC_SITE_URL (explicit config)
 * 2. VERCEL_PROJECT_PRODUCTION_URL (Vercel prod deploy)
 * 3. VERCEL_URL (any Vercel deploy, preview or prod)
 * 4. localhost:3000 (dev default)
 */
export function getSiteBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL
  if (explicit) return explicit.replace(/\/$/, '')

  const vercelProd = process.env.VERCEL_PROJECT_PRODUCTION_URL
  if (vercelProd) return `https://${vercelProd}`

  const vercel = process.env.VERCEL_URL
  if (vercel) return `https://${vercel}`

  return 'http://localhost:3000'
}
