import type { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@touracore/db/server'
import { jsonWithCors, loadRestaurantBySlug } from '../_shared'
import { autoAssignTables } from '@/app/(app)/[tenantSlug]/dine/[entitySlug]/reservations/auto-assign'

export async function OPTIONS(req: NextRequest) {
  return jsonWithCors({}, { status: 204, origin: req.headers.get('origin') })
}

/**
 * GET /api/public/restaurant/availability?slug=xxx&date=2026-04-20&party=4&service=Cena
 * Ritorna lista slot disponibili (HH:MM) con flag deposit required.
 */
export async function GET(req: NextRequest) {
  const origin = req.headers.get('origin')
  const slug = req.nextUrl.searchParams.get('slug')
  const date = req.nextUrl.searchParams.get('date')
  const party = parseInt(req.nextUrl.searchParams.get('party') ?? '2', 10)
  const service = req.nextUrl.searchParams.get('service') ?? null

  if (!slug || !date) {
    return jsonWithCors({ error: 'slug + date required' }, { status: 400, origin })
  }

  const ctx = await loadRestaurantBySlug(slug)
  if (!ctx) return jsonWithCors({ error: 'Not found' }, { status: 404, origin })

  const dayOfWeek = new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase().slice(0, 3)
  const dayHours = ctx.opening_hours[dayOfWeek] ?? []

  // Genera slots a step 30min dentro le finestre opening_hours
  const slots: string[] = []
  for (const window of dayHours) {
    const [oh, om] = window.open.split(':').map(Number)
    const [ch, cm] = window.close.split(':').map(Number)
    const start = (oh ?? 0) * 60 + (om ?? 0)
    const end = (ch ?? 0) * 60 + (cm ?? 0) - ctx.avg_turn_minutes
    for (let t = start; t <= end; t += 30) {
      const hh = String(Math.floor(t / 60)).padStart(2, '0')
      const mm = String(t % 60).padStart(2, '0')
      slots.push(`${hh}:${mm}`)
    }
  }

  // Default fallback se nessuna opening_hours configurata
  if (slots.length === 0) {
    const defaults = ['12:00', '12:30', '13:00', '13:30', '14:00', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00']
    slots.push(...defaults)
  }

  const admin = await createServiceRoleClient()
  const [{ data: tables }, { data: existing }] = await Promise.all([
    admin
      .from('restaurant_tables')
      .select('id, seats_min, seats_max, active, joinable_with')
      .eq('restaurant_id', ctx.id)
      .eq('active', true),
    admin
      .from('restaurant_reservations')
      .select('table_ids, slot_date, slot_time, duration_minutes')
      .eq('restaurant_id', ctx.id)
      .eq('slot_date', date)
      .in('status', ['confirmed', 'seated']),
  ])

  const conflicts = (existing ?? []).map((r) => {
    const start = new Date(`${r.slot_date as string}T${r.slot_time as string}`)
    return {
      table_ids: (r.table_ids as string[]) ?? [],
      start,
      end: new Date(start.getTime() + (r.duration_minutes as number) * 60_000),
    }
  })

  const candidateTables = (tables ?? []).map((t) => ({
    id: t.id as string,
    seats_min: t.seats_min as number,
    seats_max: t.seats_max as number,
    active: t.active as boolean,
    joinable_with: (t.joinable_with as string[]) ?? [],
  }))

  const availableSlots = slots
    .map((slotTime) => {
      const ids = autoAssignTables({
        tables: candidateTables,
        existing: conflicts,
        partySize: party,
        slotDate: date,
        slotTime,
        durationMinutes: ctx.avg_turn_minutes,
      })
      return { time: slotTime, available: ids.length > 0 }
    })
    .filter((s) => s.available)
    .map((s) => s.time)

  const depositPolicy = ctx.deposit_policy
  const depositRequired = Boolean(
    depositPolicy.enabled && (!depositPolicy.above_party || party >= depositPolicy.above_party)
  )
  const depositAmount = depositRequired ? (depositPolicy.amount_per_cover ?? 0) * party : 0

  return jsonWithCors(
    {
      slug,
      date,
      partySize: party,
      service,
      slots: availableSlots,
      depositRequired,
      depositAmount,
    },
    { status: 200, origin },
  )
}
