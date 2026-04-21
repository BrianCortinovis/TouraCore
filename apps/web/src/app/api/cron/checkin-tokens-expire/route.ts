import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@touracore/db/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: Request) {
  return handler(req)
}

export async function POST(req: Request) {
  return handler(req)
}

async function handler(req: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return NextResponse.json({ error: 'cron_not_configured' }, { status: 503 })
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${secret}`) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const supabase = await createServiceRoleClient()
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('checkin_tokens')
    .update({ status: 'expired' })
    .in('status', ['pending', 'started'])
    .lt('expires_at', now)
    .select('id')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, expired: data?.length ?? 0 })
}
