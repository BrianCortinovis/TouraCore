import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createHmac } from 'node:crypto'
import { generateUpdateCardToken, getUpdateCardUrl } from './magic-link'

const TEST_SECRET = 'test-magic-secret-1234567890'
const ORIG = process.env.MAGIC_LINK_SECRET

beforeAll(() => {
  process.env.MAGIC_LINK_SECRET = TEST_SECRET
})

afterAll(() => {
  if (ORIG === undefined) delete process.env.MAGIC_LINK_SECRET
  else process.env.MAGIC_LINK_SECRET = ORIG
})

describe('generateUpdateCardToken', () => {
  it('struttura token: vertical.reservationId.exp.hmac', () => {
    const token = generateUpdateCardToken({ vertical: 'hospitality', reservationId: 'r-123' })
    const parts = token.split('.')
    expect(parts).toHaveLength(4)
    expect(parts[0]).toBe('hospitality')
    expect(parts[1]).toBe('r-123')
    expect(parts[2]).toMatch(/^\d+$/)
    expect(parts[3]).toMatch(/^[a-f0-9]{64}$/)
  })

  it('exp default 7 giorni nel futuro', () => {
    const before = Math.floor(Date.now() / 1000) + 7 * 24 * 3600 - 5
    const token = generateUpdateCardToken({ vertical: 'hospitality', reservationId: 'r-1' })
    const exp = Number(token.split('.')[2])
    const after = Math.floor(Date.now() / 1000) + 7 * 24 * 3600 + 5
    expect(exp).toBeGreaterThanOrEqual(before)
    expect(exp).toBeLessThanOrEqual(after)
  })

  it('rispetta ttlSeconds custom', () => {
    const ttl = 3600
    const token = generateUpdateCardToken({ vertical: 'bike', reservationId: 'r-9', ttlSeconds: ttl })
    const exp = Number(token.split('.')[2])
    const expectedExp = Math.floor(Date.now() / 1000) + ttl
    expect(Math.abs(exp - expectedExp)).toBeLessThanOrEqual(2)
  })

  it('HMAC è verificabile con stesso secret', () => {
    const token = generateUpdateCardToken({ vertical: 'restaurant', reservationId: 'r-42' })
    const [vert, resId, exp, sig] = token.split('.')
    const payload = `${vert}.${resId}.${exp}`
    const expected = createHmac('sha256', TEST_SECRET).update(payload).digest('hex')
    expect(sig).toBe(expected)
  })

  it('reservationId diversi → token diversi', () => {
    const a = generateUpdateCardToken({ vertical: 'hospitality', reservationId: 'a' })
    const b = generateUpdateCardToken({ vertical: 'hospitality', reservationId: 'b' })
    expect(a).not.toBe(b)
  })

  it('vertical diversi → HMAC diverse anche con stesso reservationId', () => {
    const ttl = 3600
    const a = generateUpdateCardToken({ vertical: 'hospitality', reservationId: 'r1', ttlSeconds: ttl })
    const b = generateUpdateCardToken({ vertical: 'bike', reservationId: 'r1', ttlSeconds: ttl })
    expect(a.split('.')[3]).not.toBe(b.split('.')[3])
  })
})

describe('getUpdateCardUrl', () => {
  it('costruisce URL con base default', () => {
    const url = getUpdateCardUrl({ vertical: 'hospitality', reservationId: 'r-1' })
    expect(url).toMatch(/^https:\/\/touracore\.vercel\.app\/r\/[^/]+\/update-card$/)
  })

  it('rispetta baseUrl esplicito', () => {
    const url = getUpdateCardUrl({ vertical: 'hospitality', reservationId: 'r-1' }, 'https://example.com')
    expect(url).toMatch(/^https:\/\/example\.com\/r\/[^/]+\/update-card$/)
  })
})
