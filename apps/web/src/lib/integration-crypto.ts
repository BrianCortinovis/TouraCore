import 'server-only'
import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'node:crypto'

function encryptionKey(): Buffer {
  const secret = process.env.INTEGRATIONS_ENCRYPTION_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
  if (!secret) throw new Error('INTEGRATIONS_ENCRYPTION_KEY missing')
  return createHash('sha256').update(secret).digest()
}

export function encryptConfig(plaintext: string): { ciphertext: string; iv: string } {
  const key = encryptionKey()
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return {
    ciphertext: Buffer.concat([enc, tag]).toString('base64'),
    iv: iv.toString('base64'),
  }
}

export function decryptConfig(ciphertextB64: string, ivB64: string): string {
  const key = encryptionKey()
  const iv = Buffer.from(ivB64, 'base64')
  const data = Buffer.from(ciphertextB64, 'base64')
  const tag = data.subarray(data.length - 16)
  const enc = data.subarray(0, data.length - 16)
  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8')
}
