// Magic link signing per "aggiorna carta" cliente non-loggato.
// Token: <vertical>.<reservationId>.<expSec>.<hmac(sha256)>
// Verifica in apps/web/src/app/r/[token]/update-card/route.ts

import { createHmac } from 'node:crypto'

export type Vertical = 'hospitality' | 'restaurant' | 'bike' | 'experience'

export interface MagicLinkInput {
  vertical: Vertical
  reservationId: string
  /** Default 7 giorni */
  ttlSeconds?: number
}

export function generateUpdateCardToken(input: MagicLinkInput): string {
  const secret = process.env.MAGIC_LINK_SECRET ?? process.env.CRON_SECRET ?? ''
  if (!secret) throw new Error('MAGIC_LINK_SECRET not configured')

  const ttl = input.ttlSeconds ?? 7 * 24 * 3600
  const expSec = Math.floor(Date.now() / 1000) + ttl
  const payload = `${input.vertical}.${input.reservationId}.${expSec}`
  const hmac = createHmac('sha256', secret).update(payload).digest('hex')
  return `${payload}.${hmac}`
}

export function getUpdateCardUrl(input: MagicLinkInput, baseUrl?: string): string {
  const token = generateUpdateCardToken(input)
  const base = baseUrl ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'https://touracore.vercel.app'
  return `${base}/r/${token}/update-card`
}
