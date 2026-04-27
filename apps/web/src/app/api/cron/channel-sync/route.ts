import { NextRequest, NextResponse } from 'next/server'
import { verifyCronSecret } from "@/lib/cron-auth"
import { createServiceRoleClient } from '@touracore/db/server'
import { runFullSync } from '@touracore/channels/sync'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

function authorize(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  if (request.headers.get('x-vercel-cron')) return true
  return verifyCronSecret(request)
}

export async function GET(request: NextRequest) {
  if (!authorize(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createServiceRoleClient()
  const { data: connections } = await supabase
    .from('channel_connections')
    .select('*')
    .eq('is_active', true)
    .in('channel_name', ['booking', 'booking_com', 'airbnb', 'expedia'])

  const results = []
  for (const conn of connections ?? []) {
    const res = await runFullSync(supabase, conn as never)
    results.push({ connectionId: conn.id, provider: conn.channel_name, ...res })
  }

  return NextResponse.json({ ok: true, processed: results.length, results })
}
