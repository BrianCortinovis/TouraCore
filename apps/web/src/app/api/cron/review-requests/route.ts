import { NextRequest, NextResponse } from 'next/server'
import { verifyCronSecret } from "@/lib/cron-auth"
import { createServiceRoleClient } from '@touracore/db/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

function authorize(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  if (request.headers.get('x-vercel-cron')) return true
  return verifyCronSecret(request)
}

export async function GET(request: NextRequest) {
  if (!authorize(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createServiceRoleClient()
  const now = new Date()
  const since = new Date(now.getTime() - 72 * 3600_000).toISOString()
  const cutoff = new Date(now.getTime() - 24 * 3600_000).toISOString()

  const { data: reservations } = await supabase
    .from('reservations')
    .select('id, entity_id, guest_id, actual_check_out')
    .eq('status', 'checked_out')
    .gte('actual_check_out', since)
    .lte('actual_check_out', cutoff)

  let created = 0
  for (const r of reservations ?? []) {
    const { data: existing } = await supabase
      .from('review_requests')
      .select('id')
      .eq('reservation_id', r.id)
      .maybeSingle()
    if (existing) continue

    const { error } = await supabase.from('review_requests').insert({
      reservation_id: r.id,
      channel: 'email',
      sent_at: now.toISOString(),
    })
    if (!error) created++
  }

  return NextResponse.json({ ok: true, requests_created: created })
}
