import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { signVoucherJwt, verifyVoucherJwt } from './jwt'

const TEST_SECRET = 'unit-test-secret-' + 'x'.repeat(32)
const ORIG_SECRET = process.env.VOUCHER_JWT_SECRET
const ORIG_NODE_ENV = process.env.NODE_ENV

beforeAll(() => {
  process.env.VOUCHER_JWT_SECRET = TEST_SECRET
  process.env.NODE_ENV = 'test'
})

afterAll(() => {
  if (ORIG_SECRET === undefined) delete process.env.VOUCHER_JWT_SECRET
  else process.env.VOUCHER_JWT_SECRET = ORIG_SECRET
  if (ORIG_NODE_ENV === undefined) delete process.env.NODE_ENV
  else process.env.NODE_ENV = ORIG_NODE_ENV
})

describe('signVoucherJwt + verifyVoucherJwt', () => {
  const payload = {
    instrumentId: 'instr-123',
    tenantId: 'tenant-abc',
    kind: 'gift_card' as const,
    purpose: 'delivery' as const,
  }

  it('round-trips payload', async () => {
    const token = await signVoucherJwt(payload)
    expect(typeof token).toBe('string')
    expect(token.split('.')).toHaveLength(3) // header.payload.sig

    const decoded = await verifyVoucherJwt(token)
    expect(decoded).toEqual(payload)
  })

  it('returns null on tampered token', async () => {
    const token = await signVoucherJwt(payload)
    const parts = token.split('.')
    const tampered = parts[0] + '.' + parts[1] + '.AAAA' + (parts[2] ?? '').slice(4)
    expect(await verifyVoucherJwt(tampered)).toBeNull()
  })

  it('returns null on garbage', async () => {
    expect(await verifyVoucherJwt('not.a.jwt')).toBeNull()
    expect(await verifyVoucherJwt('')).toBeNull()
  })

  it('returns null when signed with different secret', async () => {
    const token = await signVoucherJwt(payload)
    process.env.VOUCHER_JWT_SECRET = 'different-secret-' + 'y'.repeat(32)
    try {
      expect(await verifyVoucherJwt(token)).toBeNull()
    } finally {
      process.env.VOUCHER_JWT_SECRET = TEST_SECRET
    }
  })

  it('respects custom expiresIn', async () => {
    const token = await signVoucherJwt(payload, { expiresIn: '1s' })
    // Verifica subito: ok
    expect(await verifyVoucherJwt(token)).toEqual(payload)
    // Aspetta 1.5s: scaduto
    await new Promise((r) => setTimeout(r, 1100))
    expect(await verifyVoucherJwt(token)).toBeNull()
  })
})

describe('JWT secret validation', () => {
  it('throws if secret < 32 chars', async () => {
    const saved = process.env.VOUCHER_JWT_SECRET
    process.env.VOUCHER_JWT_SECRET = 'short'
    try {
      await expect(signVoucherJwt({ instrumentId: 'x', tenantId: 'y', kind: 'k', purpose: 'view' })).rejects.toThrow(/at least 32/)
    } finally {
      process.env.VOUCHER_JWT_SECRET = saved
    }
  })
})
