import { createCipheriv, createDecipheriv, randomBytes, createHash, createHmac } from 'node:crypto'

function key(): Buffer {
  const secret = process.env.INTEGRATIONS_ENCRYPTION_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
  if (!secret) throw new Error('INTEGRATIONS_ENCRYPTION_KEY missing')
  return createHash('sha256').update(secret).digest()
}

// Stores iv+ciphertext+tag concatenated base64 → single text column
export function encryptJson(obj: unknown): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key(), iv)
  const enc = Buffer.concat([cipher.update(JSON.stringify(obj), 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, enc, tag]).toString('base64')
}

export function decryptJson<T = Record<string, unknown>>(packed: string): T {
  const buf = Buffer.from(packed, 'base64')
  const iv = buf.subarray(0, 12)
  const tag = buf.subarray(buf.length - 16)
  const enc = buf.subarray(12, buf.length - 16)
  const dec = createDecipheriv('aes-256-gcm', key(), iv)
  dec.setAuthTag(tag)
  const plain = Buffer.concat([dec.update(enc), dec.final()]).toString('utf8')
  return JSON.parse(plain) as T
}

export function signUnsubscribeToken(subjectEmail: string, eventKey: string, salt?: string): string {
  const k = key()
  const payload = `${subjectEmail}|${eventKey}|${salt ?? ''}`
  return createHmac('sha256', k).update(payload).digest('base64url').slice(0, 32)
}
