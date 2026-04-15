'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@touracore/db/server'
import type { ReservationStatus } from '@touracore/hospitality/src/types/database'

interface ReservationRow {
  id: string
  reservation_code: string
  guest_name: string
  guest_email: string | null
  check_in: string
  check_out: string
  status: ReservationStatus
  source: string
  total_amount: number
  paid_amount: number
  currency: string
  room_number: string | null
}

export async function getReservationsAction(
  entitySlug: string,
  page = 1,
  status?: string,
  search?: string
): Promise<{ data: ReservationRow[]; total: number }> {
  const supabase = await createServerSupabaseClient()

  const { data: entity } = await supabase
    .from('entities')
    .select('id')
    .eq('slug', entitySlug)
    .single()

  if (!entity) return { data: [], total: 0 }

  const perPage = 25
  const from = (page - 1) * perPage

  let query = supabase
    .from('reservations')
    .select(
      'id, reservation_code, check_in, check_out, status, source, total_amount, paid_amount, currency, room:rooms(room_number), guest:guests(first_name, last_name, email)',
      { count: 'exact' }
    )
    .eq('entity_id', entity.id)
    .order('check_in', { ascending: false })
    .range(from, from + perPage - 1)

  if (status) {
    query = query.eq('status', status)
  }

  if (search) {
    query = query.or(
      `reservation_code.ilike.%${search}%,channel_reservation_id.ilike.%${search}%`
    )
  }

  const { data, count, error } = await query

  if (error) throw new Error(error.message)

  const rows: ReservationRow[] = (data ?? []).map((r: Record<string, unknown>) => {
    const guest = r.guest as Record<string, unknown> | null
    const room = r.room as Record<string, unknown> | null
    return {
      id: r.id as string,
      reservation_code: (r.reservation_code as string) ?? '',
      guest_name: guest ? `${guest.first_name ?? ''} ${guest.last_name ?? ''}`.trim() : 'Ospite',
      guest_email: (guest?.email as string | null) ?? null,
      check_in: r.check_in as string,
      check_out: r.check_out as string,
      status: r.status as ReservationStatus,
      source: (r.source as string) ?? 'direct',
      total_amount: Number(r.total_amount ?? 0),
      paid_amount: Number(r.paid_amount ?? 0),
      currency: (r.currency as string) ?? 'EUR',
      room_number: (room?.room_number as string | null) ?? null,
    }
  })

  return { data: rows, total: count ?? 0 }
}

export async function getReservationStatsAction(
  entitySlug: string
): Promise<Record<ReservationStatus, number>> {
  const supabase = await createServerSupabaseClient()

  const { data: entity } = await supabase
    .from('entities')
    .select('id')
    .eq('slug', entitySlug)
    .single()

  const stats: Record<ReservationStatus, number> = {
    inquiry: 0, option: 0, confirmed: 0, checked_in: 0, checked_out: 0, cancelled: 0, no_show: 0,
  }

  if (!entity) return stats

  const statuses: ReservationStatus[] = ['inquiry', 'option', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show']

  const results = await Promise.all(
    statuses.map((s) =>
      supabase
        .from('reservations')
        .select('id', { count: 'exact', head: true })
        .eq('entity_id', entity.id)
        .eq('status', s)
    )
  )

  statuses.forEach((s, i) => {
    stats[s] = results[i]?.count ?? 0
  })

  return stats
}

export async function updateReservationStatusAction(
  entitySlug: string,
  reservationId: string,
  newStatus: ReservationStatus,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient()

  const { data: entity } = await supabase
    .from('entities')
    .select('id')
    .eq('slug', entitySlug)
    .single()

  if (!entity) {
    return { success: false, error: 'Struttura non trovata.' }
  }

  const updateData: Record<string, unknown> = {
    status: newStatus,
    updated_at: new Date().toISOString(),
  }

  if (newStatus === 'cancelled') {
    updateData.cancelled_at = new Date().toISOString()
    if (reason) updateData.cancellation_reason = reason
  }

  if (newStatus === 'checked_in') {
    updateData.actual_check_in = new Date().toISOString()
  }

  if (newStatus === 'checked_out') {
    updateData.actual_check_out = new Date().toISOString()
  }

  const { error } = await supabase
    .from('reservations')
    .update(updateData)
    .eq('id', reservationId)
    .eq('entity_id', entity.id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/bookings')
  return { success: true }
}
