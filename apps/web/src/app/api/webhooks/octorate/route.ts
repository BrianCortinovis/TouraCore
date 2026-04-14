import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@touracore/db/server'

interface OctorateReservation {
  reservation_id: string
  property_id: string
  channel: string
  guest_name: string
  guest_email?: string
  guest_phone?: string
  check_in: string
  check_out: string
  room_type_id?: string
  adults?: number
  children?: number
  total_amount?: number
  currency?: string
  status: string
  notes?: string
}

export async function POST(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key')

  if (!apiKey) {
    return NextResponse.json({ error: 'Missing API key' }, { status: 401 })
  }

  let body: { event: string; data: OctorateReservation }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { event, data } = body

  if (!event || !data) {
    return NextResponse.json({ error: 'Missing event or data' }, { status: 400 })
  }

  const supabase = await createServiceRoleClient()

  const { data: connection } = await supabase
    .from('channel_connections')
    .select('id, entity_id, settings')
    .eq('channel_name', 'octorate')
    .eq('is_active', true)
    .eq('property_id_external', data.property_id)
    .single()

  if (!connection) {
    return NextResponse.json({ error: 'Unknown property' }, { status: 404 })
  }

  const storedKey = (connection.settings as Record<string, unknown>)?.webhook_api_key
  if (storedKey && storedKey !== apiKey) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
  }

  try {
    switch (event) {
      case 'reservation.created':
      case 'reservation.modified': {
        const { data: entity } = await supabase
          .from('entities')
          .select('tenant_id')
          .eq('id', connection.entity_id)
          .single()

        if (!entity) {
          return NextResponse.json({ error: 'Entity not found' }, { status: 404 })
        }

        const bookingData = {
          tenant_id: entity.tenant_id,
          entity_id: connection.entity_id,
          vertical: 'hospitality',
          status: data.status === 'cancelled' ? 'canceled' as const : 'confirmed' as const,
          guest_name: data.guest_name,
          guest_email: data.guest_email ?? '',
          guest_phone: data.guest_phone ?? null,
          check_in: data.check_in,
          check_out: data.check_out,
          total_amount: data.total_amount ?? 0,
          currency: data.currency ?? 'EUR',
          notes: data.notes ?? null,
          source: 'api' as const,
          vertical_data: {
            octorate_reservation_id: data.reservation_id,
            channel: data.channel,
            room_type_id: data.room_type_id,
            adults: data.adults ?? 1,
            children: data.children ?? 0,
          },
          metadata: {
            channel_connection_id: connection.id,
            octorate_property_id: data.property_id,
          },
        }

        const { data: existingBooking } = await supabase
          .from('bookings')
          .select('id')
          .eq('entity_id', connection.entity_id)
          .contains('vertical_data', { octorate_reservation_id: data.reservation_id })
          .maybeSingle()

        if (existingBooking) {
          await supabase
            .from('bookings')
            .update({
              ...bookingData,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingBooking.id)
        } else {
          await supabase
            .from('bookings')
            .insert(bookingData)
        }

        await supabase.from('channel_sync_logs').insert({
          entity_id: connection.entity_id,
          channel_connection_id: connection.id,
          sync_type: event,
          direction: 'inbound',
          status: 'success',
          details: { reservation_id: data.reservation_id, channel: data.channel },
        })

        break
      }

      case 'reservation.cancelled': {
        const { data: booking } = await supabase
          .from('bookings')
          .select('id')
          .eq('entity_id', connection.entity_id)
          .contains('vertical_data', { octorate_reservation_id: data.reservation_id })
          .maybeSingle()

        if (booking) {
          await supabase
            .from('bookings')
            .update({
              status: 'canceled',
              canceled_at: new Date().toISOString(),
              canceled_reason: `Cancellato via ${data.channel ?? 'Octorate'}`,
            })
            .eq('id', booking.id)
        }

        await supabase.from('channel_sync_logs').insert({
          entity_id: connection.entity_id,
          channel_connection_id: connection.id,
          sync_type: 'reservation.cancelled',
          direction: 'inbound',
          status: 'success',
          details: { reservation_id: data.reservation_id },
        })

        break
      }

      default:
        await supabase.from('channel_sync_logs').insert({
          entity_id: connection.entity_id,
          channel_connection_id: connection.id,
          sync_type: event,
          direction: 'inbound',
          status: 'success',
          details: { unhandled: true },
        })
    }

    await supabase
      .from('channel_connections')
      .update({
        last_sync_at: new Date().toISOString(),
        last_sync_status: 'success',
      })
      .eq('id', connection.id)

    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error'

    await supabase.from('channel_sync_logs').insert({
      entity_id: connection.entity_id,
      channel_connection_id: connection.id,
      sync_type: event,
      direction: 'inbound',
      status: 'error',
      error_message: message,
      details: { event, reservation_id: data.reservation_id },
    })

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
