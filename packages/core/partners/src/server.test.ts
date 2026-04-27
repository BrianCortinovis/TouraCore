import { describe, it, expect } from 'vitest'
import { createHmac } from 'node:crypto'
import {
  generateReferralCode,
  computeCommissionAmount,
  resolveCommissionPct,
  verifyHmacSignature,
} from './server'

describe('generateReferralCode', () => {
  it('format SLUG-XXXXXX (uppercase)', () => {
    const code = generateReferralCode('myagency')
    expect(code).toMatch(/^MYAGENCY-[0-9A-F]{6}$/)
  })

  it('strips non-alphanumerics + uppercases', () => {
    const code = generateReferralCode('Agency Spa & Co!')
    expect(code).toMatch(/^AGENCYSP-[0-9A-F]{6}$/)
  })

  it('truncates slug to 8 chars', () => {
    const code = generateReferralCode('verylongpartnerslugexample')
    const slug = code.split('-')[0] ?? ''
    expect(slug.length).toBe(8)
  })

  it('produces unique suffixes (CSPRNG)', () => {
    const codes = new Set<string>()
    for (let i = 0; i < 100; i++) codes.add(generateReferralCode('x'))
    expect(codes.size).toBe(100)
  })
})

describe('computeCommissionAmount', () => {
  it('15% di €100 = €15', () => {
    expect(computeCommissionAmount(100, 15)).toBe(15)
  })

  it('15% di €123.45 = €18.52 (round 2 decimali)', () => {
    expect(computeCommissionAmount(123.45, 15)).toBe(18.52)
  })

  it('0% = 0', () => {
    expect(computeCommissionAmount(500, 0)).toBe(0)
  })

  it('100% = booking amount', () => {
    expect(computeCommissionAmount(50, 100)).toBe(50)
  })

  it('booking 0 = 0', () => {
    expect(computeCommissionAmount(0, 15)).toBe(0)
  })

  it('round half-up corretto su .005', () => {
    // 100 * 0.075 = 7.5 esatto, no rounding edge
    expect(computeCommissionAmount(100, 7.5)).toBe(7.5)
    // 33.33 * 15 / 100 = 4.9995 → round 5.00 (Math.round half-up sui binari standard)
    expect(computeCommissionAmount(33.33, 15)).toBeCloseTo(5.00, 2)
  })

  it('accetta pct come stringa numerica', () => {
    expect(computeCommissionAmount(100, '15' as unknown as number)).toBe(15)
  })
})

describe('resolveCommissionPct (precedenza)', () => {
  it('link override ha priorità su tutto', () => {
    expect(
      resolveCommissionPct({
        linkOverride: 25,
        perVertical: { hospitality: 10 },
        vertical: 'hospitality',
        defaultPct: 5,
      }),
    ).toBe(25)
  })

  it('perVertical batte default quando link è null', () => {
    expect(
      resolveCommissionPct({
        linkOverride: null,
        perVertical: { hospitality: 12 },
        vertical: 'hospitality',
        defaultPct: 5,
      }),
    ).toBe(12)
  })

  it('default usato quando né link né vertical', () => {
    expect(
      resolveCommissionPct({
        linkOverride: null,
        perVertical: { restaurant: 10 },
        vertical: 'experiences',
        defaultPct: 8,
      }),
    ).toBe(8)
  })

  it('linkOverride 0 NON è considerato null (fix legitimate 0%)', () => {
    expect(
      resolveCommissionPct({
        linkOverride: 0,
        perVertical: { hospitality: 10 },
        vertical: 'hospitality',
        defaultPct: 5,
      }),
    ).toBe(0)
  })
})

describe('verifyHmacSignature', () => {
  const SECRET = 'test-secret-1234567890'
  const body = '{"foo":"bar"}'

  function sign(ts: string, b: string, secret = SECRET): string {
    return createHmac('sha256', secret).update(`${ts}.${b}`).digest('hex')
  }

  it('accepts valid signature within tolerance', () => {
    const ts = String(Math.floor(Date.now() / 1000))
    const sig = sign(ts, body)
    expect(verifyHmacSignature({ secret: SECRET, timestamp: ts, body, signature: sig })).toBe(true)
  })

  it('rejects mismatched signature', () => {
    const ts = String(Math.floor(Date.now() / 1000))
    expect(verifyHmacSignature({ secret: SECRET, timestamp: ts, body, signature: 'a'.repeat(64) })).toBe(false)
  })

  it('rejects tampered body', () => {
    const ts = String(Math.floor(Date.now() / 1000))
    const sig = sign(ts, body)
    expect(verifyHmacSignature({ secret: SECRET, timestamp: ts, body: '{"foo":"baz"}', signature: sig })).toBe(false)
  })

  it('rejects different secret', () => {
    const ts = String(Math.floor(Date.now() / 1000))
    const sig = sign(ts, body, 'other-secret-1234567890')
    expect(verifyHmacSignature({ secret: SECRET, timestamp: ts, body, signature: sig })).toBe(false)
  })

  it('rejects expired timestamp (>tolerance)', () => {
    const ts = String(Math.floor(Date.now() / 1000) - 3600) // 1h fa
    const sig = sign(ts, body)
    expect(verifyHmacSignature({ secret: SECRET, timestamp: ts, body, signature: sig })).toBe(false)
  })

  it('rejects future timestamp (>tolerance)', () => {
    const ts = String(Math.floor(Date.now() / 1000) + 3600)
    const sig = sign(ts, body)
    expect(verifyHmacSignature({ secret: SECRET, timestamp: ts, body, signature: sig })).toBe(false)
  })

  it('respects custom toleranceSeconds', () => {
    const ts = String(Math.floor(Date.now() / 1000) - 600) // 10min fa
    const sig = sign(ts, body)
    // tolerance default 300: rejected
    expect(verifyHmacSignature({ secret: SECRET, timestamp: ts, body, signature: sig })).toBe(false)
    // tolerance 1200: accepted
    expect(verifyHmacSignature({ secret: SECRET, timestamp: ts, body, signature: sig, toleranceSeconds: 1200 })).toBe(true)
  })

  it('rejects invalid timestamp format', () => {
    const sig = sign('not-a-number', body)
    expect(verifyHmacSignature({ secret: SECRET, timestamp: 'not-a-number', body, signature: sig })).toBe(false)
  })

  it('rejects different-length signature without crash', () => {
    const ts = String(Math.floor(Date.now() / 1000))
    expect(verifyHmacSignature({ secret: SECRET, timestamp: ts, body, signature: 'short' })).toBe(false)
  })
})
