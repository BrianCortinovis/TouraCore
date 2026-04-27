import { NextResponse } from 'next/server'
import { verifyCronSecret } from "@/lib/cron-auth"
import { createServiceRoleClient } from '@touracore/db/server'
import { generateTouristTaxForReservation } from '@touracore/hospitality/src/actions/compliance'

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
  if (!verifyCronSecret(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const supabase = await createServiceRoleClient()
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)

  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, entity_id')
    .eq('check_in', yesterday)
    .in('status', ['confirmed', 'checked_in'])

  if (!bookings || bookings.length === 0) {
    return NextResponse.json({ ok: true, processed: 0 })
  }

  const { data: existing } = await supabase
    .from('tourist_tax_records')
    .select('reservation_id')
    .in('reservation_id', bookings.map((b) => b.id))

  const alreadyDone = new Set((existing ?? []).map((r) => r.reservation_id))
  const toProcess = bookings.filter((b) => !alreadyDone.has(b.id))

  let generated = 0
  let skipped = 0
  const errors: Array<{ booking_id: string; error: string }> = []

  for (const b of toProcess) {
    try {
      const rec = await generateTouristTaxForReservation(b.entity_id as string, b.id as string)
      if (rec) generated++
      else skipped++
    } catch (e) {
      errors.push({ booking_id: b.id as string, error: e instanceof Error ? e.message : String(e) })
    }
  }

  return NextResponse.json({
    ok: true,
    date: yesterday,
    candidates: bookings.length,
    already_done: alreadyDone.size,
    generated,
    skipped_no_rate: skipped,
    errors: errors.length,
    error_details: errors.slice(0, 10),
  })
}
