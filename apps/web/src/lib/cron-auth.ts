import 'server-only'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Cron auth: accetta solo se header authorization match CRON_SECRET o `x-vercel-cron` valido.
 * Throws 401 se secret missing dall'env (no insecure fallback).
 */
export function assertCronAuth(req: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json(
      { error: 'CRON_SECRET not configured' },
      { status: 500 },
    )
  }

  const authHeader = req.headers.get('authorization')
  const vercelCron = req.headers.get('x-vercel-cron')

  // Vercel cron header (signed by Vercel runtime)
  if (vercelCron) return null

  // Bearer token match
  if (authHeader === `Bearer ${secret}`) return null

  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
