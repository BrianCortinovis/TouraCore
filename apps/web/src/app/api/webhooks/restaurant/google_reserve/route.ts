import { NextResponse, type NextRequest } from 'next/server'
import { createServiceRoleClient } from '@touracore/db/server'

/**
 * POST /api/webhooks/restaurant/google_reserve
 * Webhook ingest Google Reserve booking → crea restaurant_reservations source=google
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  // Google signed JWT verify (placeholder)
  const signature = req.headers.get('x-google-signature')
  if (!signature) return NextResponse.json({ error: 'Missing signature' }, { status: 401 })

  const { restaurantId, bookingId, slotDate, slotTime, partySize, guest } = body
  if (!restaurantId || !bookingId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const admin = await createServiceRoleClient()

  const { data: existing } = await admin
    .from('restaurant_reservations')
    .select('id')
    .eq('restaurant_id', restaurantId)
    .eq('notes_staff', `google:${bookingId}`)
    .maybeSingle()
  if (existing) return NextResponse.json({ reservationId: existing.id, idempotent: true })

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
      notes_staff: `google:${bookingId}`,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ reservationId: data.id })
}
