import { NextResponse } from 'next/server'
import { verifyCronSecret } from "@/lib/cron-auth"
import { createServiceRoleClient } from '@touracore/db/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: Request) { return handler(req) }
export async function POST(req: Request) { return handler(req) }

type Vertical = 'hospitality' | 'restaurant' | 'bike' | 'experience'

const TABLES: Record<Vertical, { table: string; checkInCol: string; statusCol: string; cancelStatus: string }> = {
  hospitality: { table: 'reservations', checkInCol: 'check_in', statusCol: 'status', cancelStatus: 'cancelled' },
  restaurant: { table: 'restaurant_reservations', checkInCol: 'slot_date', statusCol: 'status', cancelStatus: 'cancelled' },
  bike: { table: 'bike_rental_reservations', checkInCol: 'rental_start', statusCol: 'status', cancelStatus: 'cancelled' },
  experience: { table: 'experience_reservations', checkInCol: 'start_at', statusCol: 'status', cancelStatus: 'cancelled' },
}

async function handler(req: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return NextResponse.json({ error: 'cron_not_configured' }, { status: 503 })
  if (!verifyCronSecret(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const supabase = await createServiceRoleClient()
  const threshold = new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString()
  const results: Array<{ vertical: Vertical; reservation_id: string; cancelled: boolean }> = []

  for (const [vertical, cfg] of Object.entries(TABLES) as Array<[Vertical, typeof TABLES[Vertical]]>) {
    const { data } = await supabase
      .from(cfg.table)
      .select(`id, ${cfg.checkInCol}`)
      .eq('payment_state', 'failed')
      .lte(cfg.checkInCol, threshold)
      .limit(100)

    for (const row of (data ?? []) as unknown as Array<Record<string, unknown>>) {
      const id = row.id as string
      // Check no retry pending
      const { data: lastAttempt } = await supabase
        .from('reservation_payment_attempts')
        .select('retry_at').eq('vertical', vertical).eq('reservation_id', id)
        .order('attempt_number', { ascending: false }).limit(1).maybeSingle()
      const retryAt = (lastAttempt as { retry_at?: string | null } | null)?.retry_at
      if (retryAt && new Date(retryAt).getTime() > Date.now()) {
        results.push({ vertical, reservation_id: id, cancelled: false })
        continue
      }

      await supabase.from(cfg.table).update({
        payment_state: 'auto_cancelled',
        [cfg.statusCol]: cfg.cancelStatus,
      }).eq('id', id)

      results.push({ vertical, reservation_id: id, cancelled: true })
    }
  }

  return NextResponse.json({ ok: true, processed: results.length, results })
}
