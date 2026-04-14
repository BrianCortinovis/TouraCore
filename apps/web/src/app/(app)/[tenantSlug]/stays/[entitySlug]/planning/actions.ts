'use server'

import { createServerSupabaseClient } from '@touracore/db/server'

export interface PlanningRoom {
  id: string
  room_number: string
  name: string | null
  floor: number | null
  room_type_id: string
  room_type_name: string
  base_price: number | null
}

export interface PlanningBooking {
  id: string
  room_id: string | null
  guest_name: string
  guest_email: string
  guest_phone: string | null
  check_in: string
  check_out: string
  status: 'pending' | 'confirmed' | 'canceled' | 'completed' | 'no_show'
  source: 'direct' | 'portal' | 'widget' | 'api'
  total_amount: number
  currency: string
  notes: string | null
  guest_count: number | null
}

export interface PlanningBlock {
  id: string
  room_id: string
  block_type: string
  reason: string | null
  date_from: string
  date_to: string
}

export interface PlanningData {
  rooms: PlanningRoom[]
  bookings: PlanningBooking[]
  blocks: PlanningBlock[]
}

export async function getPlanningDataAction(
  entityId: string,
  fromDate: string,
  toDate: string
): Promise<{ success: boolean; data?: PlanningData; error?: string }> {
  const supabase = await createServerSupabaseClient()

  // 1. Rooms con join su room_types
  const { data: rooms, error: roomsError } = await supabase
    .from('rooms')
    .select(
      'id, room_number, name, floor, room_type_id, is_active, room_types(id, name, base_price)'
    )
    .eq('entity_id', entityId)
    .eq('is_active', true)
    .order('floor', { ascending: true, nullsFirst: false })
    .order('room_number', { ascending: true })

  if (roomsError) {
    return { success: false, error: roomsError.message }
  }

  const planningRooms: PlanningRoom[] = (rooms ?? []).map((r: Record<string, unknown>) => {
    const rt = (r.room_types as Record<string, unknown> | null) ?? {}
    return {
      id: r.id as string,
      room_number: (r.room_number as string) ?? '—',
      name: (r.name as string | null) ?? null,
      floor: (r.floor as number | null) ?? null,
      room_type_id: (r.room_type_id as string) ?? '',
      room_type_name: (rt.name as string) ?? 'Senza categoria',
      base_price: (rt.base_price as number) ?? null,
    }
  })

  // 2. Bookings — filtra sovrapposizioni con range (check_in < to AND check_out > from)
  const { data: tenantData } = await supabase
    .from('entities')
    .select('tenant_id')
    .eq('id', entityId)
    .single()

  if (!tenantData) {
    return { success: false, error: 'Entity non trovata' }
  }

  const { data: bookings, error: bookingsError } = await supabase
    .from('bookings')
    .select(
      'id, guest_name, guest_email, guest_phone, check_in, check_out, status, source, total_amount, currency, notes, vertical_data'
    )
    .eq('tenant_id', tenantData.tenant_id)
    .lt('check_in', toDate)
    .gt('check_out', fromDate)
    .order('check_in', { ascending: true })

  if (bookingsError) {
    return { success: false, error: bookingsError.message }
  }

  // Filtro bookings per isolation: mantengo solo quelle con room_id appartenente a questa entity
  // O quelle senza room_id (non ancora assegnate) se vertical_data.entity_id è questa
  const entityRoomIds = new Set(planningRooms.map((r) => r.id))

  const planningBookings: PlanningBooking[] = (bookings ?? [])
    .map((b: Record<string, unknown>) => {
      const vd = (b.vertical_data as Record<string, unknown> | null) ?? {}
      return {
        id: b.id as string,
        room_id: (vd.room_id as string | null) ?? null,
        guest_name: (b.guest_name as string) ?? '',
        guest_email: (b.guest_email as string) ?? '',
        guest_phone: (b.guest_phone as string | null) ?? null,
        check_in: b.check_in as string,
        check_out: b.check_out as string,
        status: b.status as PlanningBooking['status'],
        source: b.source as PlanningBooking['source'],
        total_amount: Number(b.total_amount ?? 0),
        currency: (b.currency as string) ?? 'EUR',
        notes: (b.notes as string | null) ?? null,
        guest_count: (vd.guest_count as number | null) ?? null,
        _verticalEntityId: (vd.entity_id as string | null) ?? null,
      }
    })
    .filter((b) => {
      // Include solo se: (a) room_id è di una camera di questa entity
      // oppure (b) vertical_data.entity_id = questa entity (per prenotazioni non assegnate)
      if (b.room_id && entityRoomIds.has(b.room_id)) return true
      if (!b.room_id && b._verticalEntityId === entityId) return true
      return false
    })
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .map(({ _verticalEntityId, ...rest }) => rest)

  // 3. Room blocks (manutenzione/OOO)
  const roomIds = planningRooms.map((r) => r.id)
  const { data: blocks } =
    roomIds.length > 0
      ? await supabase
          .from('room_blocks')
          .select('id, room_id, block_type, reason, date_from, date_to')
          .in('room_id', roomIds)
          .lte('date_from', toDate)
          .gte('date_to', fromDate)
      : { data: [] }

  const planningBlocks: PlanningBlock[] = (blocks ?? []).map(
    (b: Record<string, unknown>) => ({
      id: b.id as string,
      room_id: b.room_id as string,
      block_type: (b.block_type as string) ?? 'maintenance',
      reason: (b.reason as string | null) ?? null,
      date_from: b.date_from as string,
      date_to: b.date_to as string,
    })
  )

  return {
    success: true,
    data: {
      rooms: planningRooms,
      bookings: planningBookings,
      blocks: planningBlocks,
    },
  }
}

export async function moveBookingAction(
  bookingId: string,
  newRoomId: string,
  newCheckIn: string,
  newCheckOut: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient()

  // Recupera vertical_data esistente
  const { data: existing } = await supabase
    .from('bookings')
    .select('vertical_data')
    .eq('id', bookingId)
    .single()

  if (!existing) {
    return { success: false, error: 'Prenotazione non trovata' }
  }

  const updatedVerticalData = {
    ...(existing.vertical_data as Record<string, unknown>),
    room_id: newRoomId,
  }

  const { error } = await supabase
    .from('bookings')
    .update({
      check_in: newCheckIn,
      check_out: newCheckOut,
      vertical_data: updatedVerticalData,
    })
    .eq('id', bookingId)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}
