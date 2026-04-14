'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient, createServiceRoleClient } from '@touracore/db'
import { getCurrentOrg } from '../queries/auth'
import type { Json } from '../types/database'
import { sendEmail } from '../stubs/integrations/email'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UpdateCheckinData {
  guest_data?: Json
  document_front_url?: string | null
  document_back_url?: string | null
  privacy_signed?: boolean
  arrival_time?: string | null
  special_requests?: string | null
}

// ---------------------------------------------------------------------------
// Paths to revalidate
// ---------------------------------------------------------------------------

const CHECKIN_PATHS = [
  '/dashboard',
  '/reservations',
  '/check-in',
  '/online-checkin',
]

function revalidateCheckinPaths() {
  for (const p of CHECKIN_PATHS) {
    revalidatePath(p)
  }
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

/**
 * Create a new checkin token for a reservation.
 * Creates a token with a 7-day expiry. Returns the token UUID.
 * Requires authentication (staff operation).
 */
export async function createCheckinToken(reservationId: string) {
  if (!reservationId) throw new Error('Reservation id is required')

  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()
  const orgId = property?.id

  if (!orgId) throw new Error('Organization not found')

  const { data: reservation } = await supabase
    .from('bookings')
    .select('id')
    .eq('id', reservationId)
    .eq('entity_id', orgId)
    .maybeSingle()

  if (!reservation) {
    throw new Error('Reservation not found in this organization')
  }

  // Check if a valid (non-expired, non-completed) token already exists
  const { data: existing } = await supabase
    .from('checkin_tokens')
    .select('id, token, status, expires_at')
    .eq('entity_id', orgId)
    .eq('booking_id', reservationId)
    .in('status', ['pending', 'started'])
    .gt('expires_at', new Date().toISOString())
    .limit(1)
    .maybeSingle()

  if (existing) {
    return existing.token as string
  }

  // Generate token UUID and set 7-day expiry
  const token = crypto.randomUUID()
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

  const { data, error } = await supabase
    .from('checkin_tokens')
    .insert({
      entity_id: orgId,
      booking_id: reservationId,
      token,
      status: 'pending',
      guest_data: {},
      privacy_signed: false,
      expires_at: expiresAt.toISOString(),
    })
    .select('token')
    .single()

  if (error) throw new Error(`Failed to create checkin token: ${error.message}`)

  revalidateCheckinPaths()
  return data.token as string
}

/**
 * Update checkin data submitted by the guest.
 * Public: called from the guest-facing checkin form (no auth required).
 * Sets status to 'started' if currently 'pending'.
 */
export async function updateCheckinData(token: string, data: UpdateCheckinData) {
  if (!token) throw new Error('Token is required')

  // Use service role: called from public page by unauthenticated guests
  const supabase = await createServiceRoleClient()

  // Fetch current token to verify it's still valid
  const { data: current, error: fetchError } = await supabase
    .from('checkin_tokens')
    .select('id, status, expires_at')
    .eq('token', token)
    .single()

  if (fetchError || !current) throw new Error('Checkin token not found')
  if (current.status === 'completed') throw new Error('Check-in already completed')
  if (current.status === 'expired' || new Date(current.expires_at) < new Date()) {
    throw new Error('Checkin token has expired')
  }

  // Build update payload
  const updatePayload: Record<string, unknown> = {}

  if (data.guest_data !== undefined) updatePayload.guest_data = data.guest_data
  if (data.document_front_url !== undefined) updatePayload.document_front_url = data.document_front_url
  if (data.document_back_url !== undefined) updatePayload.document_back_url = data.document_back_url
  if (data.arrival_time !== undefined) updatePayload.arrival_time = data.arrival_time
  if (data.special_requests !== undefined) updatePayload.special_requests = data.special_requests

  if (data.privacy_signed !== undefined) {
    updatePayload.privacy_signed = data.privacy_signed
    if (data.privacy_signed) {
      updatePayload.privacy_signed_at = new Date().toISOString()
    }
  }

  // Auto-advance status from pending to started
  if (current.status === 'pending') {
    updatePayload.status = 'started'
  }

  const { error } = await supabase
    .from('checkin_tokens')
    .update(updatePayload)
    .eq('token', token)

  if (error) throw new Error(`Failed to update checkin data: ${error.message}`)

  revalidateCheckinPaths()
}

/**
 * Mark a checkin token as completed.
 * Public: called from the guest-facing checkin form on final confirmation.
 * Also updates the reservation's online_checkin_completed flag if the column exists.
 */
export async function completeCheckin(token: string) {
  if (!token) throw new Error('Token is required')

  // Use service role: called from public page by unauthenticated guests
  const supabase = await createServiceRoleClient()
  const now = new Date().toISOString()

  // Fetch the token to get booking_id and guest_data
  const { data: tokenData, error: fetchError } = await supabase
    .from('checkin_tokens')
    .select('id, entity_id, booking_id, guest_data, status, expires_at')
    .eq('token', token)
    .single()

  if (fetchError || !tokenData) throw new Error('Checkin token not found')
  if (tokenData.status === 'completed') throw new Error('Check-in already completed')
  if (tokenData.status === 'expired' || new Date(tokenData.expires_at) < new Date()) {
    throw new Error('Checkin token has expired')
  }

  // Update reservation state first so downstream PMS flows see the check-in.
  const guestData = (tokenData.guest_data ?? {}) as Record<string, unknown>
  const reservationUpdate: Record<string, unknown> = {
    status: 'checked_in',
    actual_check_in: now,
    online_checkin_completed: true,
    updated_at: now,
  }

  if (guestData.pet_count || guestData.pet_details) {
    reservationUpdate.pet_count = Number(guestData.pet_count) || 0
    reservationUpdate.pet_details = guestData.pet_details || []
  }

  const { error: reservationError } = await supabase
    .from('bookings')
    .update(reservationUpdate)
    .eq('id', tokenData.booking_id)
    .eq('entity_id', tokenData.entity_id)

  if (reservationError) {
    throw new Error(`Failed to update reservation during checkin: ${reservationError.message}`)
  }

  // Mark token as completed only after the reservation update succeeds.
  const { error: updateError } = await supabase
    .from('checkin_tokens')
    .update({
      status: 'completed',
      completed_at: now,
    })
    .eq('token', token)

  if (updateError) throw new Error(`Failed to complete checkin: ${updateError.message}`)

  revalidateCheckinPaths()
}

/**
 * Create a checkin token if one doesn't exist and "send" an email invitation.
 * Currently logs the invitation; email sending will be integrated later.
 * Requires authentication (staff operation).
 */
export async function sendCheckinInvitation(reservationId: string) {
  if (!reservationId) throw new Error('Reservation id is required')

  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()
  const orgId = property?.id

  if (!orgId) throw new Error('Organization not found')

  const { data: reservationRecord } = await supabase
    .from('bookings')
    .select('id')
    .eq('id', reservationId)
    .eq('entity_id', orgId)
    .maybeSingle()

  if (!reservationRecord) {
    throw new Error('Reservation not found in this organization')
  }

  // Create token if it doesn't exist
  const token = await createCheckinToken(reservationId)

  // Fetch reservation + guest for email context
  const { data: reservation, error: resError } = await supabase
    .from('bookings')
    .select('*, guest:guests(first_name, last_name, email)')
    .eq('id', reservationId)
    .eq('entity_id', orgId)
    .single()

  if (resError || !reservation) throw new Error('Reservation not found')

  const guest = reservation.guest as { first_name: string; last_name: string; email: string | null }
  const checkinUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/checkin/${token}`

  // Fetch entity name for the email
  const { data: entity } = await supabase
    .from('entities')
    .select('name')
    .eq('id', orgId)
    .single()

  const structureName = entity?.name ?? 'La struttura'

  // Send the invitation email (if guest has an email)
  if (guest.email) {
    await sendEmail({
      organizationId: orgId,
      to: guest.email,
      subject: `Check-in online - ${structureName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Benvenuto/a ${guest.first_name}!</h2>
          <p>Ti invitiamo a completare il check-in online per la tua prenotazione presso <strong>${structureName}</strong>.</p>
          <p style="margin: 24px 0;">
            <a href="${checkinUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
              Completa il check-in
            </a>
          </p>
          <p style="color: #666; font-size: 14px;">Questo link scade tra 7 giorni.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="color: #999; font-size: 12px;">${structureName}</p>
        </div>
      `,
      reservationId,
    }).catch((err) => {
      console.error('[Checkin] Errore invio email invito:', err)
    })
  } else {
    console.log(`[Checkin] Ospite senza email, invito non inviato per prenotazione ${reservationId}`)
  }

  revalidateCheckinPaths()
  return { token, checkinUrl }
}

/**
 * Utility: mark all expired tokens as 'expired'.
 * Can be called by a cron job or admin action.
 */
export async function expireOldTokens() {
  const supabase = await createServerSupabaseClient()
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('checkin_tokens')
    .update({ status: 'expired' })
    .in('status', ['pending', 'started'])
    .lt('expires_at', now)
    .select('id')

  if (error) throw new Error(`Failed to expire old tokens: ${error.message}`)

  const count = data?.length ?? 0
  if (count > 0) {
    revalidateCheckinPaths()
  }

  return { expired: count }
}

// ---------------------------------------------------------------------------
// Staff Check-in / Check-out (dal pannello CMS)
// ---------------------------------------------------------------------------

import { z } from 'zod'
import { requireCurrentEntity } from '../auth/access'

export interface ActionResult {
  success: boolean
  error?: string
  data?: Record<string, unknown>
}

const checkInSchema = z.object({
  booking_id: z.string().uuid(),
  guest_id: z.string().uuid().optional(),
  document_type: z.enum(['id_card', 'passport', 'driving_license', 'residence_permit']).optional(),
  document_number: z.string().max(50).optional(),
  document_issued_by: z.string().max(200).optional(),
  document_expiry_date: z.string().optional(),
  privacy_consent: z.boolean(),
  marketing_consent: z.boolean().optional(),
})

export type StaffCheckInData = z.infer<typeof checkInSchema>

export async function checkInBooking(raw: StaffCheckInData): Promise<ActionResult> {
  const parsed = checkInSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Dati non validi' }
  }
  const input = parsed.data

  if (!input.privacy_consent) {
    return { success: false, error: 'Consenso privacy obbligatorio per il check-in' }
  }

  try {
    await requireCurrentEntity()
    const supabase = await createServerSupabaseClient()

    const { data: booking, error: fetchErr } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', input.booking_id)
      .single()

    if (fetchErr || !booking) {
      return { success: false, error: 'Prenotazione non trovata' }
    }

    if (booking.status !== 'confirmed') {
      return { success: false, error: `Check-in non consentito: stato attuale "${booking.status}". Deve essere "confirmed".` }
    }

    const now = new Date().toISOString()

    if (input.guest_id && input.document_type && input.document_number) {
      await supabase
        .from('guests')
        .update({
          document_type: input.document_type,
          document_number: input.document_number,
          document_issued_by: input.document_issued_by ?? null,
          document_expiry_date: input.document_expiry_date ?? null,
          privacy_consent: true,
          privacy_consent_date: now,
          marketing_consent: input.marketing_consent ?? false,
          marketing_consent_date: input.marketing_consent ? now : null,
        })
        .eq('id', input.guest_id)
    }

    const { error: updateErr } = await supabase
      .from('bookings')
      .update({
        status: 'checked_in',
        actual_check_in: now,
        guest_id: input.guest_id ?? booking.guest_id,
      })
      .eq('id', input.booking_id)

    if (updateErr) {
      return { success: false, error: `Errore check-in: ${updateErr.message}` }
    }

    revalidateCheckinPaths()
    return { success: true, data: { booking_id: input.booking_id, checked_in_at: now } }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Errore check-in'
    return { success: false, error: msg }
  }
}

export async function checkOutBooking(bookingId: string): Promise<ActionResult> {
  if (!bookingId) {
    return { success: false, error: 'ID prenotazione obbligatorio' }
  }

  try {
    await requireCurrentEntity()
    const supabase = await createServerSupabaseClient()

    const { data: booking, error: fetchErr } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single()

    if (fetchErr || !booking) {
      return { success: false, error: 'Prenotazione non trovata' }
    }

    if (booking.status !== 'checked_in') {
      return { success: false, error: `Check-out non consentito: stato attuale "${booking.status}". Deve essere "checked_in".` }
    }

    const now = new Date().toISOString()

    const { error: updateErr } = await supabase
      .from('bookings')
      .update({
        status: 'checked_out',
        actual_check_out: now,
      })
      .eq('id', bookingId)

    if (updateErr) {
      return { success: false, error: `Errore check-out: ${updateErr.message}` }
    }

    // Aggiorna statistiche ospite
    if (booking.guest_id) {
      const checkIn = new Date(booking.check_in)
      const checkOut = new Date(booking.check_out)
      const nights = Math.max(1, Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)))

      const { data: guest } = await supabase
        .from('guests')
        .select('total_stays, total_nights, total_revenue')
        .eq('id', booking.guest_id)
        .single()

      if (guest) {
        await supabase
          .from('guests')
          .update({
            total_stays: (guest.total_stays ?? 0) + 1,
            total_nights: (guest.total_nights ?? 0) + nights,
            total_revenue: Number(guest.total_revenue ?? 0) + Number(booking.total_amount ?? 0),
            last_stay_date: now,
          })
          .eq('id', booking.guest_id)
      }
    }

    revalidateCheckinPaths()
    return { success: true, data: { booking_id: bookingId, checked_out_at: now } }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Errore check-out'
    return { success: false, error: msg }
  }
}

export async function getTodayArrivals(): Promise<ActionResult> {
  try {
    const { property } = await requireCurrentEntity()
    const supabase = await createServerSupabaseClient()
    const today = new Date().toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('bookings')
      .select('*, guests(*)')
      .eq('entity_id', property.id)
      .eq('check_in', today)
      .in('status', ['confirmed'])
      .order('guest_name')

    if (error) {
      return { success: false, error: `Errore caricamento arrivi: ${error.message}` }
    }

    return { success: true, data: { arrivals: data ?? [] } }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Errore caricamento arrivi'
    return { success: false, error: msg }
  }
}

export async function getTodayDepartures(): Promise<ActionResult> {
  try {
    const { property } = await requireCurrentEntity()
    const supabase = await createServerSupabaseClient()
    const today = new Date().toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('bookings')
      .select('*, guests(*)')
      .eq('entity_id', property.id)
      .eq('check_out', today)
      .in('status', ['checked_in'])
      .order('guest_name')

    if (error) {
      return { success: false, error: `Errore caricamento partenze: ${error.message}` }
    }

    return { success: true, data: { departures: data ?? [] } }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Errore caricamento partenze'
    return { success: false, error: msg }
  }
}

export async function getCheckedInBookings(): Promise<ActionResult> {
  try {
    const { property } = await requireCurrentEntity()
    const supabase = await createServerSupabaseClient()

    const { data, error } = await supabase
      .from('bookings')
      .select('*, guests(*)')
      .eq('entity_id', property.id)
      .eq('status', 'checked_in')
      .order('check_out')

    if (error) {
      return { success: false, error: `Errore caricamento check-in attivi: ${error.message}` }
    }

    return { success: true, data: { bookings: data ?? [] } }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Errore caricamento'
    return { success: false, error: msg }
  }
}
