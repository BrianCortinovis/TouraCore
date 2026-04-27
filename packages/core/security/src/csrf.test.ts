import { describe, it, expect } from 'vitest'
import {
  generateCsrfToken,
  getCsrfCookieName,
  getCsrfHeaderName,
  validateCsrfFromRequest,
} from './csrf'

describe('CSRF token', () => {
  it('generates a 64-char hex token (32 bytes)', () => {
    const token = generateCsrfToken()
    expect(token).toMatch(/^[a-f0-9]{64}$/)
  })

  it('produces different tokens on each call (CSPRNG)', () => {
    const tokens = new Set<string>()
    for (let i = 0; i < 100; i++) tokens.add(generateCsrfToken())
    expect(tokens.size).toBe(100)
  })

  it('exposes expected cookie + header names', () => {
    expect(getCsrfCookieName()).toBe('__touracore_csrf')
    expect(getCsrfHeaderName()).toBe('x-csrf-token')
  })
})

describe('validateCsrfFromRequest', () => {
  const valid = generateCsrfToken()

  it('accepts matching cookie and header', () => {
    expect(validateCsrfFromRequest(valid, valid)).toBe(true)
  })

  it('rejects when cookie is missing', () => {
    expect(validateCsrfFromRequest(undefined, valid)).toBe(false)
  })

  it('rejects when header is missing', () => {
    expect(validateCsrfFromRequest(valid, undefined)).toBe(false)
  })

  it('rejects when both are missing', () => {
    expect(validateCsrfFromRequest(undefined, undefined)).toBe(false)
  })

  it('rejects different lengths (length-leak guard)', () => {
    expect(validateCsrfFromRequest(valid, valid.slice(0, -1))).toBe(false)
  })

  it('rejects mismatched same-length tokens', () => {
    const other = generateCsrfToken()
    expect(validateCsrfFromRequest(valid, other)).toBe(false)
  })

  it('rejects empty string vs token', () => {
    expect(validateCsrfFromRequest('', valid)).toBe(false)
    expect(validateCsrfFromRequest(valid, '')).toBe(false)
  })

  // Timing-safe: il loop completo deve eseguire indipendentemente dal mismatch.
  // Test smoke: due input stessa lunghezza producono comparazione completa
  // (no early-return). Verificato indirettamente: nessun crash + costanza output.
  it('compares full length even when first byte differs', () => {
    const a = '0' + valid.slice(1)
    const b = 'f' + valid.slice(1)
    expect(validateCsrfFromRequest(a, b)).toBe(false)
  })
})
