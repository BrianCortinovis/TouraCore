import { createHash, randomBytes } from 'node:crypto'
import bcrypt from 'bcryptjs'

/**
 * Unambiguous alphanumeric alphabet (no 0/O/1/I/L).
 * 32 chars = ~5 bit each → 16-char code ≈ 80 bit entropy.
 */
const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'

export interface GeneratedCode {
  plaintext: string // formatted XXXX-XXXX-XXXX-XXXX
  last4: string
  bcryptHash: string // for security deep check
  lookupHash: string // SHA-256 deterministic for fast index lookup
}

/**
 * Generate cryptographically random credit code.
 * Format: XXXX-XXXX-XXXX-XXXX (16 meaningful chars + 3 hyphens for readability).
 * ~80-bit entropy, unambiguous alphabet.
 */
export function generateCodePlaintext(length = 16): string {
  if (length < 8 || length > 32) throw new Error('code length out of range')
  const bytes = randomBytes(length)
  const chars: string[] = []
  for (let i = 0; i < length; i++) {
    const b = bytes[i] ?? 0
    chars.push(CODE_ALPHABET[b % CODE_ALPHABET.length] ?? '2')
  }
  // Group in blocks of 4 separated by hyphen
  const groups: string[] = []
  for (let i = 0; i < chars.length; i += 4) {
    groups.push(chars.slice(i, i + 4).join(''))
  }
  return groups.join('-')
}

export async function hashCodeForStorage(plaintext: string): Promise<GeneratedCode> {
  const normalized = plaintext.toUpperCase().replace(/\s+/g, '')
  const lookupHash = createHash('sha256').update(normalized).digest('hex')
  const bcryptHash = await bcrypt.hash(normalized, 10)
  const last4 = normalized.replace(/-/g, '').slice(-4)
  return { plaintext: normalized, last4, bcryptHash, lookupHash }
}

export function lookupHashFromPlaintext(plaintext: string): string {
  const normalized = plaintext.toUpperCase().replace(/\s+/g, '')
  return createHash('sha256').update(normalized).digest('hex')
}

/**
 * Display-safe mask: hide everything except last 4.
 * e.g. "****-****-****-AB12"
 */
export function maskCode(last4: string): string {
  return `****-****-****-${last4.toUpperCase()}`
}
