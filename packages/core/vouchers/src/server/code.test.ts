import { describe, it, expect } from 'vitest'
import bcrypt from 'bcryptjs'
import {
  generateCodePlaintext,
  hashCodeForStorage,
  lookupHashFromPlaintext,
  maskCode,
} from './code'

describe('generateCodePlaintext', () => {
  it('returns 16 char + 3 hyphens default', () => {
    const code = generateCodePlaintext()
    expect(code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/)
  })

  it('uses unambiguous alphabet (no 0, O, 1, I, L)', () => {
    for (let i = 0; i < 50; i++) {
      const code = generateCodePlaintext()
      expect(code).not.toMatch(/[01OIL]/)
    }
  })

  it('produces unique codes (CSPRNG)', () => {
    const codes = new Set<string>()
    for (let i = 0; i < 100; i++) codes.add(generateCodePlaintext())
    expect(codes.size).toBe(100)
  })

  it('respects custom length within 8..32', () => {
    expect(generateCodePlaintext(8).replace(/-/g, '')).toHaveLength(8)
    expect(generateCodePlaintext(24).replace(/-/g, '')).toHaveLength(24)
  })

  it('throws on length out of range', () => {
    expect(() => generateCodePlaintext(7)).toThrow(/range/)
    expect(() => generateCodePlaintext(33)).toThrow(/range/)
  })
})

describe('hashCodeForStorage', () => {
  it('returns plaintext normalized + lookup + bcrypt + last4', async () => {
    const result = await hashCodeForStorage('abcd-efgh-jkmn-pqrs')
    expect(result.plaintext).toBe('ABCD-EFGH-JKMN-PQRS')
    expect(result.last4).toBe('PQRS')
    expect(result.lookupHash).toMatch(/^[a-f0-9]{64}$/)
    expect(result.bcryptHash).toMatch(/^\$2[ab]\$10\$/)
  })

  it('bcrypt hash verifies against original code', async () => {
    const code = generateCodePlaintext()
    const stored = await hashCodeForStorage(code)
    expect(await bcrypt.compare(code, stored.bcryptHash)).toBe(true)
  })

  it('bcrypt hash rejects different code', async () => {
    const stored = await hashCodeForStorage(generateCodePlaintext())
    const wrong = generateCodePlaintext()
    expect(await bcrypt.compare(wrong, stored.bcryptHash)).toBe(false)
  })

  it('lookupHash deterministic per same input', async () => {
    const a = await hashCodeForStorage('AAAA-BBBB-CCCC-DDDD')
    const b = await hashCodeForStorage('aaaa-bbbb-cccc-dddd')
    expect(a.lookupHash).toBe(b.lookupHash)
  })

  it('bcryptHash differs across calls (salt)', async () => {
    const a = await hashCodeForStorage('AAAA-BBBB-CCCC-DDDD')
    const b = await hashCodeForStorage('AAAA-BBBB-CCCC-DDDD')
    expect(a.bcryptHash).not.toBe(b.bcryptHash)
  })
})

describe('lookupHashFromPlaintext', () => {
  it('matches hashCodeForStorage.lookupHash', async () => {
    const code = generateCodePlaintext()
    const stored = await hashCodeForStorage(code)
    expect(lookupHashFromPlaintext(code)).toBe(stored.lookupHash)
  })

  it('case-insensitive + whitespace tolerant', () => {
    const a = lookupHashFromPlaintext('ABCD-EFGH-JKMN-PQRS')
    const b = lookupHashFromPlaintext('  abcd-efgh-jkmn-pqrs  ')
    expect(a).toBe(b)
  })
})

describe('maskCode', () => {
  it('shows only last 4 uppercased', () => {
    expect(maskCode('abcd')).toBe('****-****-****-ABCD')
  })
})
