import 'server-only'
import { timingSafeEqual } from 'node:crypto'
import type { NextRequest } from 'next/server'

/**
 * Verifica autenticazione cron via CRON_SECRET (timing-safe).
 * Header accettati: `Authorization: Bearer <secret>` o `x-cron-secret: <secret>`.
 */
export function verifyCronSecret(req: NextRequest | Request): boolean {
  const expected = process.env.CRON_SECRET
  if (!expected) return false

  const authHeader = req.headers.get('authorization')
  const xHeader = req.headers.get('x-cron-secret')

  const provided = xHeader ?? (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null)
  if (!provided) return false

  return safeEqual(provided, expected)
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Compare comunque per timing consistency su lunghezza diversa.
    try { timingSafeEqual(Buffer.from(a), Buffer.from(a)) } catch { /* noop */ }
    return false
  }
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b))
  } catch {
    return false
  }
}
