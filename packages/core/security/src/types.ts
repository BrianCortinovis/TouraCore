export type RateLimitTier = 'auth' | 'public-api' | 'authenticated' | 'webhook' | 'widget'

export interface RateLimitConfig {
  readonly maxRequests: number
  readonly windowMs: number
}

export interface RateLimitResult {
  readonly allowed: boolean
  readonly limit: number
  readonly remaining: number
  readonly resetAt: number
}

export const RATE_LIMIT_TIERS: Record<RateLimitTier, RateLimitConfig> = {
  'auth': { maxRequests: 15, windowMs: 60_000 },
  'public-api': { maxRequests: 60, windowMs: 60_000 },
  'authenticated': { maxRequests: 120, windowMs: 60_000 },
  'webhook': { maxRequests: 30, windowMs: 60_000 },
  'widget': { maxRequests: 100, windowMs: 60_000 },
}

export interface SecurityHeadersConfig {
  readonly isDev: boolean
  readonly cspNonce?: string
  readonly isWidgetRoute?: boolean
  readonly allowedFrameAncestors?: readonly string[]
}
