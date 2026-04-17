import { NextResponse, type NextRequest } from 'next/server'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { createServiceRoleClient } from '@touracore/db/server'
import { autoAssignTables } from '@/app/(app)/[tenantSlug]/dine/[entitySlug]/reservations/auto-assign'
import { isWebhookEventProcessed, recordWebhookEvent } from '@/lib/webhook-dedup'

/**
 * POST /api/webhooks/restaurant/thefork
 * Webhook ingest TheFork → crea restaurant_reservations source=thefork
 * Verifica HMAC SHA256 con secret per restaurant
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get('x-thefork-signature')
  const eventId = req.headers.get('x-thefork-event-id')

  if (!signature || !eventId) {
    return NextResponse.json({ error: 'Missing signature/eventId' }, { status: 401 })
  }

  let body: {
    restaurantId?: string
    externalId?: string
    slotDate?: string
    slotTime?: string
    partySize?: number
    guest?: { name?: string; email?: string; phone?: string }
  }
  try {
    body = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { restaurantId, externalId, slotDate, slotTime, partySize, guest } = body
  if (!restaurantId || !externalId || !slotDate || !slotTime || !partySize || !guest) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const admin = await createServiceRoleClient()

  // Carica integration config encrypted per ottenere webhook secret
  const { data: integration } = await admin
    .from('restaurant_integrations')
    .select('config_encrypted, config_meta')
    .eq('restaurant_id', restaurantId)
    .eq('provider', 'thefork')
    .eq('is_active', true)
    .maybeSingle()

  if (!integration) {
    return NextResponse.json({ error: 'Integration not configured' }, { status: 401 })
  }

  // Verifica HMAC: secret env-level o per restaurant (whichever)
  const secret = process.env.THEFORK_WEBHOOK_SECRET ?? ''
  if (!secret) {
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  const expected = createHmac('sha256', secret).update(rawBody).digest('hex')
  const sigBuf = Buffer.from(signature, 'hex')
  const expBuf = Buffer.from(expected, 'hex')
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  // Idempotency dedup
  const dedupKey = `${restaurantId}:${eventId}`
  if (await isWebhookEventProcessed('thefork', dedupKey)) {
    return NextResponse.json({ status: 'already_processed' })
  }

  // Idempotent ingest fallback (legacy)
  const { data: existing } = await admin
    .from('restaurant_reservations')
    .select('id')
    .eq('restaurant_id', restaurantId)
    .eq('idempotency_key', `thefork:${externalId}`)
    .maybeSingle()
  if (existing) {
    await recordWebhookEvent('thefork', dedupKey, 'reservation.created')
    return NextResponse.json({ reservationId: existing.id, idempotent: true })
  }

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
      idempotency_key: `thefork:${externalId}`,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await recordWebhookEvent('thefork', dedupKey, 'reservation.created')
  return NextResponse.json({ reservationId: data.id, status: tableIds.length > 0 ? 'confirmed' : 'pending' })
}
