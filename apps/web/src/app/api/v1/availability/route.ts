import { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@touracore/db/server'
import { authenticateApiKey, createApiResponse, createErrorResponse } from '@touracore/api'

export async function GET(request: NextRequest) {
  const ctx = await authenticateApiKey(request.headers.get('authorization'))
  if (!ctx) return createErrorResponse('Unauthorized', 401)

  const { searchParams } = request.nextUrl
  const entityId = searchParams.get('entity_id')
  const checkIn = searchParams.get('check_in')
  const checkOut = searchParams.get('check_out')
  const guests = Number(searchParams.get('guests')) || 2

  if (!entityId || !checkIn || !checkOut) {
    return createErrorResponse('entity_id, check_in, and check_out are required')
  }

  const supabase = await createServiceRoleClient()

  const { data: property } = await supabase
    .from('entities')
    .select('id')
    .eq('id', entityId)
    .eq('tenant_id', ctx.tenantId)
    .single()

  if (!property) return createErrorResponse('Property not found', 404)

  const { data: roomTypes } = await supabase
    .from('room_types')
    .select('id, name, category, max_occupancy, base_price')
    .eq('entity_id', entityId)
    .eq('is_active', true)
    .gte('max_occupancy', guests)

  const { data: rooms } = await supabase
    .from('rooms')
    .select('id, room_type_id')
    .eq('entity_id', entityId)
    .eq('is_active', true)
    .in('status', ['available', 'cleaning'])

  const { data: reservations } = await supabase
    .from('reservations')
    .select('room_type_id, room_id')
    .eq('entity_id', entityId)
    .in('status', ['confirmed', 'checked_in'])
    .lt('check_in', checkOut)
    .gt('check_out', checkIn)

  const { data: blocks } = await supabase
    .from('room_blocks')
    .select('room_id')
    .eq('entity_id', entityId)
    .lt('date_from', checkOut)
    .gt('date_to', checkIn)

  const blockedIds = new Set((blocks ?? []).map((b) => b.room_id))
  const reservedIds = new Set((reservations ?? []).filter((r) => r.room_id).map((r) => r.room_id as string))

  const availability = (roomTypes ?? []).map((rt) => {
    const typeRooms = (rooms ?? []).filter((r) => r.room_type_id === rt.id)
    const free = typeRooms.filter((r) => !blockedIds.has(r.id) && !reservedIds.has(r.id))
    const unassigned = (reservations ?? []).filter((r) => r.room_type_id === rt.id && !r.room_id).length

    return {
      room_type_id: rt.id,
      name: rt.name,
      category: rt.category,
      max_occupancy: rt.max_occupancy,
      base_price: rt.base_price,
      total_rooms: typeRooms.length,
      available_rooms: Math.max(0, free.length - unassigned),
    }
  })

  return createApiResponse(availability)
}
