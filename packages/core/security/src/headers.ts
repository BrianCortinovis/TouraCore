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
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    `frame-ancestors ${frameAncestors}`,
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ]

  return {
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
    'Content-Security-Policy': cspDirectives.join('; '),
    'X-Frame-Options': isWidgetRoute ? 'ALLOWALL' : 'DENY',
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
