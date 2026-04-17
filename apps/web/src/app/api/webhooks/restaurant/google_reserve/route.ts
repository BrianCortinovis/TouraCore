import { NextResponse, type NextRequest } from 'next/server'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { createServiceRoleClient } from '@touracore/db/server'
import { isWebhookEventProcessed, recordWebhookEvent } from '@/lib/webhook-dedup'

/**
 * POST /api/webhooks/restaurant/google_reserve
 * Webhook ingest Google Reserve booking → crea restaurant_reservations source=google
 * Verifica HMAC SHA256 con GOOGLE_RESERVE_WEBHOOK_SECRET
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get('x-google-signature')
  const eventId = req.headers.get('x-google-event-id')

  if (!signature || !eventId) {
    return NextResponse.json({ error: 'Missing signature/eventId' }, { status: 401 })
  }

  const secret = process.env.GOOGLE_RESERVE_WEBHOOK_SECRET ?? ''
  if (!secret) {
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  const expected = createHmac('sha256', secret).update(rawBody).digest('hex')
  const sigBuf = Buffer.from(signature, 'hex')
  const expBuf = Buffer.from(expected, 'hex')
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let body: {
    restaurantId?: string
    bookingId?: string
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

  const { restaurantId, bookingId, slotDate, slotTime, partySize, guest } = body
  if (!restaurantId || !bookingId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const dedupKey = `${restaurantId}:${eventId}`
  if (await isWebhookEventProcessed('google_reserve', dedupKey)) {
    return NextResponse.json({ status: 'already_processed' })
  }

  const admin = await createServiceRoleClient()

  // Verifica restaurant esiste + integration attiva
  const { data: integration } = await admin
    .from('restaurant_integrations')
    .select('id')
    .eq('restaurant_id', restaurantId)
    .eq('provider', 'google_reserve')
    .eq('is_active', true)
    .maybeSingle()
  if (!integration) {
    return NextResponse.json({ error: 'Integration not configured' }, { status: 401 })
  }

  const { data: existing } = await admin
    .from('restaurant_reservations')
    .select('id')
    .eq('restaurant_id', restaurantId)
    .eq('idempotency_key', `google:${bookingId}`)
    .maybeSingle()
  if (existing) {
    await recordWebhookEvent('google_reserve', dedupKey, 'reservation.created')
    return NextResponse.json({ reservationId: existing.id, idempotent: true })
  }

  const { data, error } = await admin
    .from('restaurant_reservations')
    .insert({
      restaurant_id: restaurantId,
      guest_name: guest?.name ?? 'Google guest',
      guest_email: guest?.email,
      guest_phone: guest?.phone,
      party_size: partySize,
      slot_date: slotDate,
      slot_time: slotTime,
      status: 'pending',
      source: 'google',
      idempotency_key: `google:${bookingId}`,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await recordWebhookEvent('google_reserve', dedupKey, 'reservation.created')
  return NextResponse.json({ reservationId: data.id })
}
