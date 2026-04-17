import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@touracore/db/server'
import ical, { ICalCalendarMethod } from 'ical-generator'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ token: string }>
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { token } = await params

  if (!token || token.length < 16) {
    return new NextResponse('Invalid token', { status: 404 })
  }

  const supabase = await createServiceRoleClient()

  const { data: feed, error: feedError } = await supabase
    .from('ical_feeds')
    .select('id, name, entity_id, room_id, room_type_id, is_active, direction')
    .eq('export_token', token)
    .eq('direction', 'export')
    .maybeSingle()

  if (feedError || !feed || !feed.is_active) {
    return new NextResponse('Feed not found', { status: 404 })
  }

  const { data: entity } = await supabase
    .from('entities')
    .select('name, city')
    .eq('id', feed.entity_id)
    .single()

  const feedName = `${entity?.name ?? 'TouraCore'} - ${feed.name}`

  const calendar = ical({
    name: feedName,
    prodId: { company: 'TouraCore', product: 'iCal Sync', language: 'IT' },
    timezone: 'Europe/Rome',
    method: ICalCalendarMethod.PUBLISH,
  })

  const reservationsQuery = supabase
    .from('reservations')
    .select('id, reservation_code, check_in, check_out, guest_name, room_id, room_type_id, status, created_at, updated_at')
    .eq('entity_id', feed.entity_id)
    .in('status', ['confirmed', 'checked_in', 'checked_out'])

  if (feed.room_id) {
    reservationsQuery.eq('room_id', feed.room_id)
  } else if (feed.room_type_id) {
    reservationsQuery.eq('room_type_id', feed.room_type_id)
  }

  const { data: reservations } = await reservationsQuery

  const blocksQuery = supabase
    .from('room_blocks')
    .select('id, room_id, date_from, date_to, block_type, reason, notes, created_at, updated_at, ical_uid')
    .eq('entity_id', feed.entity_id)

  if (feed.room_id) {
    blocksQuery.eq('room_id', feed.room_id)
  }

  const { data: blocks } = await blocksQuery

  for (const res of reservations ?? []) {
    calendar.createEvent({
      id: `reservation-${res.id}@touracore`,
      start: new Date(res.check_in),
      end: new Date(res.check_out),
      allDay: true,
      summary: `Reserved — ${res.reservation_code}`,
      description: `Guest: ${res.guest_name ?? ''}\nStatus: ${res.status}`,
      created: res.created_at ? new Date(res.created_at) : undefined,
      lastModified: res.updated_at ? new Date(res.updated_at) : undefined,
    })
  }

  for (const block of blocks ?? []) {
    const uid = block.ical_uid ?? `block-${block.id}@touracore`
    const endDate = new Date(block.date_to)
    endDate.setDate(endDate.getDate() + 1)
    calendar.createEvent({
      id: uid,
      start: new Date(block.date_from),
      end: endDate,
      allDay: true,
      summary: `Blocked — ${block.block_type}`,
      description: [block.reason, block.notes].filter(Boolean).join('\n'),
      created: block.created_at ? new Date(block.created_at) : undefined,
      lastModified: block.updated_at ? new Date(block.updated_at) : undefined,
    })
  }

  return new NextResponse(calendar.toString(), {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `inline; filename="${token.slice(0, 8)}.ics"`,
      'Cache-Control': 'public, max-age=300, s-maxage=300',
    },
  })
}
