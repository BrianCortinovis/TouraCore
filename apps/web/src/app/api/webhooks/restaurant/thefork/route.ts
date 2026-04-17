import { NextResponse, type NextRequest } from 'next/server'
import { createServiceRoleClient } from '@touracore/db/server'
import { autoAssignTables } from '@/app/(app)/[tenantSlug]/dine/[entitySlug]/reservations/auto-assign'

/**
 * POST /api/webhooks/restaurant/thefork
 * Webhook ingest TheFork → crea restaurant_reservations source=thefork
 * Body: { restaurantId, externalId, slotDate, slotTime, partySize, guest: {name, email, phone}, signature }
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  // TODO: HMAC verify TheFork signature header
  const signature = req.headers.get('x-thefork-signature')
  if (!signature) return NextResponse.json({ error: 'Missing signature' }, { status: 401 })

  const { restaurantId, externalId, slotDate, slotTime, partySize, guest } = body

  if (!restaurantId || !externalId || !slotDate || !slotTime || !partySize || !guest) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const admin = await createServiceRoleClient()

  // Idempotent ingest
  const { data: existing } = await admin
    .from('restaurant_reservations')
    .select('id')
    .eq('restaurant_id', restaurantId)
    .eq('notes_staff', `thefork:${externalId}`)
    .maybeSingle()
  if (existing) return NextResponse.json({ reservationId: existing.id, idempotent: true })

  const { data: tables } = await admin
    .from('restaurant_tables')
    .select('id, seats_min, seats_max, active, joinable_with')
    .eq('restaurant_id', restaurantId)
    .eq('active', true)

  const { data: existingRes } = await admin
    .from('restaurant_reservations')
    .select('table_ids, slot_date, slot_time, duration_minutes')
    .eq('restaurant_id', restaurantId)
    .eq('slot_date', slotDate)
    .in('status', ['confirmed', 'seated'])

  const conflicts = (existingRes ?? []).map((r) => {
    const start = new Date(`${r.slot_date as string}T${r.slot_time as string}`)
    return {
      table_ids: (r.table_ids as string[]) ?? [],
      start,
      end: new Date(start.getTime() + (r.duration_minutes as number) * 60_000),
    }
  })

  const tableIds = autoAssignTables({
    tables: (tables ?? []).map((t) => ({
      id: t.id as string,
      seats_min: t.seats_min as number,
      seats_max: t.seats_max as number,
      active: t.active as boolean,
      joinable_with: (t.joinable_with as string[]) ?? [],
    })),
    existing: conflicts,
    partySize,
    slotDate,
    slotTime,
    durationMinutes: 90,
  })

  const { data, error } = await admin
    .from('restaurant_reservations')
    .insert({
      restaurant_id: restaurantId,
      guest_name: guest.name,
      guest_email: guest.email,
      guest_phone: guest.phone,
      party_size: partySize,
      slot_date: slotDate,
      slot_time: slotTime,
      table_ids: tableIds,
      status: tableIds.length > 0 ? 'confirmed' : 'pending',
      source: 'thefork',
      notes_staff: `thefork:${externalId}`,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ reservationId: data.id, status: tableIds.length > 0 ? 'confirmed' : 'pending' })
}
