import { encrypt, decrypt } from '@touracore/db/crypto'

export function encryptCredentials(credentials: Record<string, unknown>): string {
  return encrypt(JSON.stringify(credentials))
}

export function decryptCredentials(encrypted: string): Record<string, unknown> {
  if (!encrypted) return {}
  const json = decrypt(encrypted)
  return JSON.parse(json) as Record<string, unknown>
}
