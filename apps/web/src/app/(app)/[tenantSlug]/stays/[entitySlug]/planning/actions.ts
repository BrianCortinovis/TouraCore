'use server'

import { createServerSupabaseClient } from '@touracore/db/server'
import type { ReservationStatus, BookingSource } from '@touracore/hospitality/src/types/database'

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
  reservation_code: string
  room_id: string | null
  guest_name: string
  guest_email: string | null
  guest_phone: string | null
  check_in: string
  check_out: string
  status: ReservationStatus
  source: BookingSource
  total_amount: number
  currency: string
  notes: string | null
  adults: number
  children: number
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

  const { data: reservations, error: resError } = await supabase
    .from('reservations')
    .select(
      'id, reservation_code, room_id, check_in, check_out, status, source, total_amount, currency, special_requests, adults, children, guest:guests(first_name, last_name, email, phone)'
    )
    .eq('entity_id', entityId)
    .in('status', ['confirmed', 'checked_in', 'option', 'inquiry'])
    .lt('check_in', toDate)
    .gt('check_out', fromDate)
    .order('check_in', { ascending: true })

  if (resError) {
    return { success: false, error: resError.message }
  }

  const planningBookings: PlanningBooking[] = (reservations ?? []).map(
    (r: Record<string, unknown>) => {
      const guest = r.guest as Record<string, unknown> | null
      const firstName = (guest?.first_name as string) ?? ''
      const lastName = (guest?.last_name as string) ?? ''
      return {
        id: r.id as string,
        reservation_code: (r.reservation_code as string) ?? '',
        room_id: (r.room_id as string | null) ?? null,
        guest_name: `${firstName} ${lastName}`.trim() || 'Ospite',
        guest_email: (guest?.email as string | null) ?? null,
        guest_phone: (guest?.phone as string | null) ?? null,
        check_in: r.check_in as string,
        check_out: r.check_out as string,
        status: r.status as ReservationStatus,
        source: r.source as BookingSource,
        total_amount: Number(r.total_amount ?? 0),
        currency: (r.currency as string) ?? 'EUR',
        notes: (r.special_requests as string | null) ?? null,
        adults: Number(r.adults ?? 1),
        children: Number(r.children ?? 0),
      }
    }
  )

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
  reservationId: string,
  newRoomId: string,
  newCheckIn: string,
  newCheckOut: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase
    .from('reservations')
    .update({
      room_id: newRoomId,
      check_in: newCheckIn,
      check_out: newCheckOut,
    })
    .eq('id', reservationId)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}
