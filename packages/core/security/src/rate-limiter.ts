import { RATE_LIMIT_TIERS, type RateLimitConfig, type RateLimitResult, type RateLimitTier } from './types'

// ─────────────────────────────────────────────────────────────────────────────
// Backend dual: Upstash Redis REST (prod multi-instance) + in-memory (dev/test).
// In Vercel multi-instance la Map non è condivisa → senza Upstash il limit è inefficace.
// Activation automatica se UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN presenti.
// ─────────────────────────────────────────────────────────────────────────────

interface RateLimitEntry {
  count: number
  resetAt: number
}

const memStore = new Map<string, RateLimitEntry>()
let lastCleanup = Date.now()
const CLEANUP_INTERVAL_MS = 60_000

function cleanupMem(): void {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return
  lastCleanup = now
  for (const [key, entry] of memStore) {
    if (entry.resetAt <= now) memStore.delete(key)
  }
}

function memCheck(key: string, config: RateLimitConfig): RateLimitResult {
  cleanupMem()
  const now = Date.now()
  const existing = memStore.get(key)
  if (!existing || existing.resetAt <= now) {
    memStore.set(key, { count: 1, resetAt: now + config.windowMs })
    return { allowed: true, limit: config.maxRequests, remaining: config.maxRequests - 1, resetAt: now + config.windowMs }
  }
  existing.count++
  const remaining = Math.max(0, config.maxRequests - existing.count)
  const allowed = existing.count <= config.maxRequests
  return { allowed, limit: config.maxRequests, remaining, resetAt: existing.resetAt }
}

interface UpstashConfig { url: string; token: string }

function getUpstash(): UpstashConfig | null {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  return { url, token }
}

/**
 * Upstash atomic INCR + PEXPIRE pattern via pipeline.
 * Single round-trip per check. Fail-open su errore di rete (non bloccare prod su outage Redis).
 */
async function upstashCheck(
  upstash: UpstashConfig,
  key: string,
  config: RateLimitConfig,
): Promise<RateLimitResult> {
  const windowSec = Math.ceil(config.windowMs / 1000)
  try {
    const res = await fetch(`${upstash.url}/pipeline`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${upstash.token}`,
      },
      body: JSON.stringify([
        ['INCR', key],
        ['EXPIRE', key, String(windowSec), 'NX'],
        ['PTTL', key],
      ]),
      // 1.5s timeout difensivo
      signal: AbortSignal.timeout(1500),
    })
    if (!res.ok) throw new Error(`upstash status ${res.status}`)
    const arr = (await res.json()) as Array<{ result: number }>
    const count = Number(arr[0]?.result ?? 1)
    const pttl = Number(arr[2]?.result ?? config.windowMs)
    const resetAt = Date.now() + (pttl > 0 ? pttl : config.windowMs)
    const remaining = Math.max(0, config.maxRequests - count)
    return {
      allowed: count <= config.maxRequests,
      limit: config.maxRequests,
      remaining,
      resetAt,
    }
  } catch (e) {
    // Fail-open: meglio passare un request che bloccare tutto su Redis down.
    // Loggato per alert; mem fallback decoupled.
    console.error('[rate-limiter] upstash failure, fallback memory', e instanceof Error ? e.message : e)
    return memCheck(key, config)
  }
}

export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult | Promise<RateLimitResult> {
  const upstash = getUpstash()
  if (upstash) return upstashCheck(upstash, key, config)
  return memCheck(key, config)
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
  memStore.clear()
}
