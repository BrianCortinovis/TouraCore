import { NextResponse } from 'next/server'
import { dispatchPending } from '@touracore/notifications'

export const dynamic = 'force-dynamic'

function unauthorized() {
  return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
}

export async function POST(req: Request) {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = req.headers.get('authorization') ?? ''
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return unauthorized()
  }

  const { searchParams } = new URL(req.url)
  const limit = Math.min(Number(searchParams.get('limit') ?? 25), 100)
  const result = await dispatchPending(limit)
  return NextResponse.json({ dispatched: true, ...result })
}

export async function GET(req: Request) {
  return POST(req)
}
