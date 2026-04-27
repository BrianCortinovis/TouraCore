import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { randomBytes } from 'node:crypto'
import { encrypt, decrypt } from './encryption'

const TEST_KEY = randomBytes(32).toString('base64')
const ORIGINAL_KEY = process.env.ENCRYPTION_KEY

beforeAll(() => {
  process.env.ENCRYPTION_KEY = TEST_KEY
})

afterAll(() => {
  if (ORIGINAL_KEY === undefined) delete process.env.ENCRYPTION_KEY
  else process.env.ENCRYPTION_KEY = ORIGINAL_KEY
})

describe('AES-256-GCM encrypt/decrypt round-trip', () => {
  it('round-trips ASCII plaintext', () => {
    const cipher = encrypt('hello world')
    expect(cipher).not.toBe('hello world')
    expect(decrypt(cipher)).toBe('hello world')
  })

  it('round-trips UTF-8 (accents, emoji)', () => {
    const text = 'Caffè ☕ — TouraCore 🇮🇹'
    expect(decrypt(encrypt(text))).toBe(text)
  })

  it('round-trips long JSON-like payload', () => {
    const payload = JSON.stringify({ user_id: 'abc-123', token: 'sk_test_'.padEnd(200, 'x') })
    expect(decrypt(encrypt(payload))).toBe(payload)
  })

  it('round-trips empty string', () => {
    expect(decrypt(encrypt(''))).toBe('')
  })

  it('produces different ciphertexts for same plaintext (random IV)', () => {
    const a = encrypt('same plaintext')
    const b = encrypt('same plaintext')
    expect(a).not.toBe(b)
    expect(decrypt(a)).toBe(decrypt(b))
  })

  it('output is base64', () => {
    const cipher = encrypt('test')
    expect(cipher).toMatch(/^[A-Za-z0-9+/]+=*$/)
  })
})

describe('decrypt errors', () => {
  it('throws on too-short ciphertext', () => {
    expect(() => decrypt('Zm9v')).toThrow(/troppo corto|formato/)
  })

  it('throws on tampered tag (auth integrity check)', () => {
    const cipher = encrypt('integrity test')
    const buf = Buffer.from(cipher, 'base64')
    // flip 1 bit nel tag (offset 12..28)
    buf[15] = (buf[15] ?? 0) ^ 0xff
    const tampered = buf.toString('base64')
    expect(() => decrypt(tampered)).toThrow()
  })

  it('throws on tampered ciphertext body', () => {
    const cipher = encrypt('body integrity')
    const buf = Buffer.from(cipher, 'base64')
    // flip ultimo byte (encrypted body)
    buf[buf.length - 1] = (buf[buf.length - 1] ?? 0) ^ 0xff
    const tampered = buf.toString('base64')
    expect(() => decrypt(tampered)).toThrow()
  })
})

describe('ENCRYPTION_KEY validation', () => {
  it('throws if key missing', () => {
    const saved = process.env.ENCRYPTION_KEY
    delete process.env.ENCRYPTION_KEY
    try {
      expect(() => encrypt('x')).toThrow(/ENCRYPTION_KEY non configurata/)
    } finally {
      process.env.ENCRYPTION_KEY = saved
    }
  })

  it('throws if key wrong length (not 32 bytes base64)', () => {
    const saved = process.env.ENCRYPTION_KEY
    process.env.ENCRYPTION_KEY = randomBytes(16).toString('base64')
    try {
      expect(() => encrypt('x')).toThrow(/32 bytes/)
    } finally {
      process.env.ENCRYPTION_KEY = saved
    }
  })
})
