'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient, createServiceRoleClient } from '@touracore/db/server'
import type { ReservationStatus } from '@touracore/hospitality/src/types/database'
import { z } from 'zod'

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

// ============================================================================
// CREATE / EDIT / CANCEL / REFUND
// ============================================================================

const CreateReservationSchema = z.object({
  entitySlug: z.string(),
  guest: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().optional(),
    countryCode: z.string().length(2).default('IT'),
  }),
  checkIn: z.string(),
  checkOut: z.string(),
  roomTypeId: z.string().uuid(),
  roomId: z.string().uuid().optional(),
  ratePlanId: z.string().uuid().optional(),
  adults: z.number().int().min(1).default(1),
  children: z.number().int().min(0).default(0),
  totalAmount: z.number().min(0).default(0),
  currency: z.string().default('EUR'),
  source: z.enum(['direct', 'phone', 'email', 'walk_in', 'website']).default('direct'),
  specialRequests: z.string().optional(),
})

export async function createReservationAction(input: z.infer<typeof CreateReservationSchema>): Promise<{ success: boolean; error?: string; reservationId?: string }> {
  const parsed = CreateReservationSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Validazione fallita' }

  const supabase = await createServerSupabaseClient()
  const { data: entity } = await supabase
    .from('entities')
    .select('id, tenant_id')
    .eq('slug', parsed.data.entitySlug)
    .single()
  if (!entity) return { success: false, error: 'Struttura non trovata' }

  if (new Date(parsed.data.checkOut) <= new Date(parsed.data.checkIn)) {
    return { success: false, error: 'Check-out deve essere dopo check-in' }
  }

  const admin = await createServiceRoleClient()

  // Find or create guest
  let guestId: string | null = null
  if (parsed.data.guest.email) {
    const { data: existing } = await admin
      .from('guests')
      .select('id')
      .eq('tenant_id', entity.tenant_id)
      .eq('email', parsed.data.guest.email)
      .maybeSingle()
    if (existing) guestId = existing.id as string
  }

  if (!guestId) {
    const { data: newGuest, error: guestErr } = await admin
      .from('guests')
      .insert({
        tenant_id: entity.tenant_id,
        first_name: parsed.data.guest.firstName,
        last_name: parsed.data.guest.lastName,
        email: parsed.data.guest.email || null,
        phone: parsed.data.guest.phone || null,
        country_code: parsed.data.guest.countryCode,
      })
      .select('id')
      .single()
    if (guestErr || !newGuest) return { success: false, error: guestErr?.message ?? 'Errore creazione guest' }
    guestId = newGuest.id as string
  }

  // Generate reservation_code (YYYY-NNNN)
  const year = new Date().getFullYear()
  const { count } = await admin
    .from('reservations')
    .select('*', { count: 'exact', head: true })
    .eq('entity_id', entity.id)
    .gte('created_at', `${year}-01-01`)
  const reservationCode = `${year}-${String((count ?? 0) + 1).padStart(4, '0')}`

  const { data: created, error } = await admin
    .from('reservations')
    .insert({
      entity_id: entity.id,
      reservation_code: reservationCode,
      guest_id: guestId,
      room_type_id: parsed.data.roomTypeId,
      room_id: parsed.data.roomId ?? null,
      rate_plan_id: parsed.data.ratePlanId ?? null,
      check_in: parsed.data.checkIn,
      check_out: parsed.data.checkOut,
      adults: parsed.data.adults,
      children: parsed.data.children,
      total_amount: parsed.data.totalAmount,
      currency: parsed.data.currency,
      source: parsed.data.source,
      status: 'confirmed',
      special_requests: parsed.data.specialRequests ?? null,
    })
    .select('id')
    .single()

  if (error || !created) return { success: false, error: error?.message ?? 'Errore creazione' }

  revalidatePath('/bookings')
  return { success: true, reservationId: created.id as string }
}

const EditReservationSchema = z.object({
  reservationId: z.string().uuid(),
  entitySlug: z.string(),
  checkIn: z.string().optional(),
  checkOut: z.string().optional(),
  roomId: z.string().uuid().nullable().optional(),
  adults: z.number().int().min(1).optional(),
  children: z.number().int().min(0).optional(),
  totalAmount: z.number().min(0).optional(),
  specialRequests: z.string().optional(),
})

export async function editReservationAction(input: z.infer<typeof EditReservationSchema>): Promise<{ success: boolean; error?: string }> {
  const parsed = EditReservationSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Validazione fallita' }

  const supabase = await createServerSupabaseClient()
  const { data: entity } = await supabase
    .from('entities')
    .select('id')
    .eq('slug', parsed.data.entitySlug)
    .single()
  if (!entity) return { success: false, error: 'Struttura non trovata' }

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (parsed.data.checkIn) update.check_in = parsed.data.checkIn
  if (parsed.data.checkOut) update.check_out = parsed.data.checkOut
  if (parsed.data.roomId !== undefined) update.room_id = parsed.data.roomId
  if (parsed.data.adults !== undefined) update.adults = parsed.data.adults
  if (parsed.data.children !== undefined) update.children = parsed.data.children
  if (parsed.data.totalAmount !== undefined) update.total_amount = parsed.data.totalAmount
  if (parsed.data.specialRequests !== undefined) update.special_requests = parsed.data.specialRequests

  const { error } = await supabase
    .from('reservations')
    .update(update)
    .eq('id', parsed.data.reservationId)
    .eq('entity_id', entity.id)
  if (error) return { success: false, error: error.message }

  revalidatePath('/bookings')
  return { success: true }
}

export async function cancelReservationAction(input: { reservationId: string; entitySlug: string; reason?: string }): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient()
  const { data: entity } = await supabase
    .from('entities')
    .select('id')
    .eq('slug', input.entitySlug)
    .single()
  if (!entity) return { success: false, error: 'Struttura non trovata' }

  const { error } = await supabase
    .from('reservations')
    .update({ status: 'cancelled', notes: input.reason ?? null, updated_at: new Date().toISOString() })
    .eq('id', input.reservationId)
    .eq('entity_id', entity.id)
  if (error) return { success: false, error: error.message }

  try {
    const { revokePinsForReservation } = await import('../locks/actions')
    await revokePinsForReservation(input.reservationId)
  } catch (e) {
    console.error('[cancel] revokePins failed:', e)
  }

  revalidatePath('/bookings')
  return { success: true }
}

const RefundSchema = z.object({
  reservationId: z.string().uuid(),
  entitySlug: z.string(),
  amount: z.number().min(0.01),
  reason: z.string().optional(),
  reasonCategory: z.enum(['cancellation', 'complaint', 'overpayment', 'goodwill', 'technical', 'other']).default('cancellation'),
})

export async function refundReservationAction(input: z.infer<typeof RefundSchema>): Promise<{ success: boolean; error?: string; refundId?: string }> {
  const parsed = RefundSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Validazione fallita' }

  const supabase = await createServerSupabaseClient()
  const { data: entity } = await supabase
    .from('entities')
    .select('id')
    .eq('slug', parsed.data.entitySlug)
    .single()
  if (!entity) return { success: false, error: 'Struttura non trovata' }

  const { data: reservation } = await supabase
    .from('reservations')
    .select('id, paid_amount, currency')
    .eq('id', parsed.data.reservationId)
    .eq('entity_id', entity.id)
    .maybeSingle()
  if (!reservation) return { success: false, error: 'Prenotazione non trovata' }

  const paidAmount = Number(reservation.paid_amount ?? 0)
  if (parsed.data.amount > paidAmount) {
    return { success: false, error: `Rimborso massimo possibile € ${paidAmount.toFixed(2)}` }
  }

  const admin = await createServiceRoleClient()
  const { data: refund, error } = await admin
    .from('payment_refunds')
    .insert({
      entity_id: entity.id,
      reservation_id: parsed.data.reservationId,
      amount: parsed.data.amount,
      currency: (reservation.currency as string) ?? 'EUR',
      reason: parsed.data.reason ?? null,
      reason_category: parsed.data.reasonCategory,
      status: 'pending', // requires manual Stripe submission
    })
    .select('id')
    .single()
  if (error || !refund) return { success: false, error: error?.message ?? 'Errore creazione refund' }

  // Update paid_amount on reservation
  await admin
    .from('reservations')
    .update({ paid_amount: paidAmount - parsed.data.amount, updated_at: new Date().toISOString() })
    .eq('id', parsed.data.reservationId)

  revalidatePath('/bookings')
  return { success: true, refundId: refund.id as string }
}

export async function sendCheckinInvitationAction(reservationId: string): Promise<{ success: boolean; error?: string; checkinUrl?: string }> {
  if (!reservationId) return { success: false, error: 'Reservation id mancante' }
  try {
    const { sendCheckinInvitation } = await import('@touracore/hospitality/src/actions/checkin')
    const r = await sendCheckinInvitation(reservationId)
    revalidatePath('/bookings')
    return { success: true, checkinUrl: r.checkinUrl }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Errore invio invito' }
  }
}

