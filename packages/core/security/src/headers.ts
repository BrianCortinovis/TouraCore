import type { SecurityHeadersConfig } from './types'

export function getSecurityHeaders(config: SecurityHeadersConfig): Record<string, string> {
  const { isDev, isWidgetRoute, allowedFrameAncestors } = config

  const frameAncestors = isWidgetRoute
    ? (allowedFrameAncestors?.length ? allowedFrameAncestors.join(' ') : '*')
    : "'none'"

  const cspDirectives = [
    "default-src 'self'",
    // Next App Router relies on inline scripts for RSC/hydration payloads.
    // In production we allow inline scripts here so client components can hydrate.
    `script-src 'self'${isDev ? " 'unsafe-eval' 'unsafe-inline'" : " 'unsafe-inline'"}`,
    "style-src 'self' 'unsafe-inline'",
    // img-src: stretto su domini noti (Supabase, R2 Cloudflare, Unsplash, YouTube thumbs, OG images allowed via app routes)
    "img-src 'self' data: blob: https://*.supabase.co https://*.r2.cloudflarestorage.com https://*.r2.dev https://images.unsplash.com https://i.ytimg.com",
    "font-src 'self' data:",
    // connect-src: include Stripe (api+radar), Supabase REST/realtime, GA, Vercel analytics
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://r.stripe.com https://www.google-analytics.com https://*.google-analytics.com https://www.googletagmanager.com https://vitals.vercel-insights.com https://va.vercel-scripts.com",
    // frame-src: video embed + Stripe Checkout/Connect/3DS challenge
    "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com https://js.stripe.com https://hooks.stripe.com https://checkout.stripe.com https://connect.stripe.com",
    `frame-ancestors ${frameAncestors}`,
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ]

  return {
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
    'Content-Security-Policy': cspDirectives.join('; '),
    // X-Frame-Options: ALLOWALL non è valore valido HTTP. Per route widget si fa solo via frame-ancestors (CSP).
    // Per route normali manteniamo DENY.
    'X-Frame-Options': isWidgetRoute ? 'SAMEORIGIN' : 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  }
}

export function applySecurityHeaders(
  headers: Headers,
  config: SecurityHeadersConfig,
): void {
  const securityHeaders = getSecurityHeaders(config)
  for (const [key, value] of Object.entries(securityHeaders)) {
    headers.set(key, value)
  }
}
