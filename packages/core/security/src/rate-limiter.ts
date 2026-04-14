import { RATE_LIMIT_TIERS, type RateLimitConfig, type RateLimitResult, type RateLimitTier } from './types'

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

let lastCleanup = Date.now()
const CLEANUP_INTERVAL_MS = 60_000

function cleanup(): void {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return
  lastCleanup = now

  for (const [key, entry] of store) {
    if (entry.resetAt <= now) {
      store.delete(key)
    }
  }
}

export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  cleanup()

  const now = Date.now()
  const existing = store.get(key)

  if (!existing || existing.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + config.windowMs })
    return { allowed: true, limit: config.maxRequests, remaining: config.maxRequests - 1, resetAt: now + config.windowMs }
  }

  existing.count++
  const remaining = Math.max(0, config.maxRequests - existing.count)
  const allowed = existing.count <= config.maxRequests

  return { allowed, limit: config.maxRequests, remaining, resetAt: existing.resetAt }
}

export function classifyRoute(pathname: string): RateLimitTier {
  if (pathname.startsWith('/api/auth') || pathname === '/login' || pathname === '/register' || pathname.startsWith('/forgot-password') || pathname.startsWith('/reset-password')) {
    return 'auth'
  }
  if (pathname.startsWith('/api/webhooks')) {
    return 'webhook'
  }
  if (pathname.startsWith('/api/widget') || pathname.startsWith('/book/') || pathname.startsWith('/widget/') || pathname.startsWith('/portali/') || pathname.startsWith('/property/')) {
    return 'widget'
  }
  if (pathname.startsWith('/api/v1')) {
    return 'public-api'
  }
  return 'authenticated'
}

export function getRateLimitKey(
  tier: RateLimitTier,
  ip: string,
  userId?: string,
): string {
  if (tier === 'authenticated' && userId) {
    return `rl:${tier}:${userId}`
  }
  if (tier === 'widget') {
    return `rl:${tier}:${ip}`
  }
  return `rl:${tier}:${ip}`
}

export function getRateLimitConfig(tier: RateLimitTier): RateLimitConfig {
  return RATE_LIMIT_TIERS[tier]
}

export function setRateLimitHeaders(headers: Headers, result: RateLimitResult): void {
  headers.set('X-RateLimit-Limit', String(result.limit))
  headers.set('X-RateLimit-Remaining', String(result.remaining))
  headers.set('X-RateLimit-Reset', String(Math.ceil(result.resetAt / 1000)))

  if (!result.allowed) {
    const retryAfterSec = Math.ceil((result.resetAt - Date.now()) / 1000)
    headers.set('Retry-After', String(Math.max(1, retryAfterSec)))
  }
}

export function resetRateLimitStore(): void {
  store.clear()
}
