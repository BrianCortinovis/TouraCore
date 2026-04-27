import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  checkRateLimit,
  classifyRoute,
  getRateLimitConfig,
  getRateLimitKey,
  resetRateLimitStore,
} from './rate-limiter'
import { RATE_LIMIT_TIERS } from './types'

// Forza branch in-memory: nessun env Upstash impostato.
const ORIGINAL_ENV = { ...process.env }

describe('classifyRoute', () => {
  it.each([
    ['/login', 'auth'],
    ['/register', 'auth'],
    ['/forgot-password', 'auth'],
    ['/reset-password', 'auth'],
    ['/api/auth/login', 'auth'],
    ['/api/webhooks/stripe', 'webhook'],
    ['/api/v1/reservations', 'public-api'],
    ['/book/villa-irabo', 'widget'],
    ['/widget/abc', 'widget'],
    ['/api/widget/foo', 'widget'],
    ['/portali/test', 'widget'],
    ['/property/abc', 'widget'],
    ['/dashboard', 'authenticated'],
    ['/foo/bar', 'authenticated'],
  ])('classifies %s as %s', (pathname, expected) => {
    expect(classifyRoute(pathname)).toBe(expected)
  })
})

describe('getRateLimitKey', () => {
  it('uses userId for authenticated tier', () => {
    expect(getRateLimitKey('authenticated', '1.2.3.4', 'user-abc')).toBe('rl:authenticated:user-abc')
  })

  it('falls back to IP if no userId on authenticated', () => {
    expect(getRateLimitKey('authenticated', '1.2.3.4')).toBe('rl:authenticated:1.2.3.4')
  })

  it('always uses IP for non-authenticated tiers', () => {
    expect(getRateLimitKey('auth', '1.2.3.4')).toBe('rl:auth:1.2.3.4')
    expect(getRateLimitKey('webhook', '1.2.3.4')).toBe('rl:webhook:1.2.3.4')
    expect(getRateLimitKey('widget', '1.2.3.4', 'user-x')).toBe('rl:widget:1.2.3.4')
    expect(getRateLimitKey('public-api', '1.2.3.4')).toBe('rl:public-api:1.2.3.4')
  })
})

describe('getRateLimitConfig', () => {
  it('returns expected tier configs', () => {
    expect(getRateLimitConfig('auth')).toEqual({ maxRequests: 15, windowMs: 60_000 })
    expect(getRateLimitConfig('webhook')).toEqual({ maxRequests: 30, windowMs: 60_000 })
    expect(getRateLimitConfig('public-api')).toEqual({ maxRequests: 60, windowMs: 60_000 })
    expect(getRateLimitConfig('widget')).toEqual({ maxRequests: 100, windowMs: 60_000 })
    expect(getRateLimitConfig('authenticated')).toEqual({ maxRequests: 120, windowMs: 60_000 })
  })
})

describe('checkRateLimit (in-memory fallback)', () => {
  beforeEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
    resetRateLimitStore()
  })

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV }
    resetRateLimitStore()
  })

  it('allows first request and decrements remaining', async () => {
    const cfg = RATE_LIMIT_TIERS.auth
    const result = await checkRateLimit('test:key:1', cfg)
    expect(result.allowed).toBe(true)
    expect(result.limit).toBe(15)
    expect(result.remaining).toBe(14)
    expect(result.resetAt).toBeGreaterThan(Date.now())
  })

  it('blocks at exactly maxRequests + 1', async () => {
    const cfg = RATE_LIMIT_TIERS.auth // 15 / min
    let last: Awaited<ReturnType<typeof checkRateLimit>> = await checkRateLimit('test:key:2', cfg)
    for (let i = 0; i < 14; i++) last = await checkRateLimit('test:key:2', cfg)
    // 15a richiesta ancora allowed
    expect(last.allowed).toBe(true)
    // 16a deve essere bloccata
    const blocked = await checkRateLimit('test:key:2', cfg)
    expect(blocked.allowed).toBe(false)
    expect(blocked.remaining).toBe(0)
  })

  it('keeps separate counters per key', async () => {
    const cfg = RATE_LIMIT_TIERS.auth
    for (let i = 0; i < 15; i++) await checkRateLimit('test:keyA', cfg)
    const blockedA = await checkRateLimit('test:keyA', cfg)
    expect(blockedA.allowed).toBe(false)
    // keyB resta libero
    const freshB = await checkRateLimit('test:keyB', cfg)
    expect(freshB.allowed).toBe(true)
    expect(freshB.remaining).toBe(14)
  })

  it('returns sane resetAt within configured window', async () => {
    const cfg = RATE_LIMIT_TIERS['public-api']
    const before = Date.now()
    const result = await checkRateLimit('test:key:reset', cfg)
    expect(result.resetAt).toBeGreaterThanOrEqual(before + cfg.windowMs - 50)
    expect(result.resetAt).toBeLessThanOrEqual(Date.now() + cfg.windowMs + 50)
  })
})
