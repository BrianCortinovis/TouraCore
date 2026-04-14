'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient, createServiceRoleClient } from '@touracore/db'
import { getCurrentOrg } from '../queries/auth'
import {
  generateAlloggiatiRecord,
  type AlloggiatiGuest,
  type AlloggiatiReservation,
} from '../compliance/alloggiati-web'
import type { AlloggiatiStatus, PaymentMethod } from '../types/database'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CreateAmlRecordData {
  entity_id: string
  payment_id?: string | null
  reservation_id?: string | null
  guest_id: string
  amount: number
  currency?: string
  transaction_date: string
  is_threshold_exceeded?: boolean
  cumulative_cash_amount?: number
  guest_name: string
  guest_document_type?: string | null
  guest_document_number?: string | null
  guest_fiscal_code?: string | null
  guest_nationality?: string | null
  verified_by?: string | null
  verified_at?: string | null
  verification_notes?: string | null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const COMPLIANCE_PATHS = [
  '/compliance/alloggiati',
  '/compliance/istat',
  '/compliance/tourist-tax',
  '/compliance/aml',
]

function revalidateCompliancePaths() {
  for (const p of COMPLIANCE_PATHS) {
    revalidatePath(p)
  }
}

// ---------------------------------------------------------------------------
// Alloggiati Web Actions
// ---------------------------------------------------------------------------

/**
 * Generate Alloggiati Web registration records for the given reservations.
 *
 * For each reservation:
 *   1. Fetches the reservation (with guest data).
 *   2. Builds the fixed-width record via the alloggiati-web library.
 *   3. Inserts a police_registrations row with the generated content.
 */
export async function generateAlloggiatiFile(reservationIds: string[]) {
  if (!reservationIds || reservationIds.length === 0) {
    throw new Error('At least one reservation id is required')
  }

  const supabase = await createServerSupabaseClient()

  // Fetch reservations with guest data
  const { data: reservations, error: fetchError } = await supabase
    .from('bookings')
    .select(`
      id,
      entity_id,
      check_in,
      check_out,
      guest_id,
      guests:guest_id (
        id,
        first_name,
        last_name,
        gender,
        date_of_birth,
        birth_place,
        birth_province,
        birth_country,
        citizenship,
        document_type,
        document_number,
        document_issued_by
      )
    `)
    .in('id', reservationIds)

  if (fetchError) throw new Error(`Failed to fetch reservations: ${fetchError.message}`)
  if (!reservations || reservations.length === 0) {
    throw new Error('No reservations found for the given ids')
  }

  const registrations: Array<{ id: string; booking_id: string }> = []
  const skipped: Array<{ booking_id: string; reason: string }> = []

  for (const reservation of reservations) {
    // The guest join returns an object (single guest per reservation)
    const guest = reservation.guests as unknown as {
      id: string
      first_name: string
      last_name: string
      gender: string | null
      date_of_birth: string | null
      birth_place: string | null
      birth_province: string | null
      birth_country: string | null
      citizenship: string | null
      document_type: string | null
      document_number: string | null
      document_issued_by: string | null
    }

    if (!guest) {
      skipped.push({ booking_id: reservation.id, reason: 'Dati ospite non trovati' })
      continue
    }

    // Validate minimum required fields
    const missingFields: string[] = []
    if (!guest.date_of_birth) missingFields.push('data_nascita')
    if (!guest.birth_country) missingFields.push('stato_nascita')
    if (!guest.citizenship) missingFields.push('cittadinanza')
    if (!guest.document_type) missingFields.push('tipo_documento')
    if (!guest.document_number) missingFields.push('numero_documento')
    if (!guest.birth_place) missingFields.push('luogo_nascita')

    if (missingFields.length > 0) {
      skipped.push({
        booking_id: reservation.id,
        reason: `Campi obbligatori mancanti: ${missingFields.join(', ')}`,
      })
      continue
    }

    // Map guest to the AlloggiatiGuest interface
    // Fields are guaranteed non-null by the missingFields check above
    const alloggiatiGuest: AlloggiatiGuest = {
      last_name: guest.last_name!,
      first_name: guest.first_name!,
      gender: (guest.gender === 'M' ? 'M' : 'F') as 'M' | 'F',
      date_of_birth: guest.date_of_birth!,
      birth_place: guest.birth_place!,
      birth_province: guest.birth_province ?? null,
      birth_country: guest.birth_country!,
      citizenship: guest.citizenship!,
      document_type: guest.document_type as AlloggiatiGuest['document_type'],
      document_number: guest.document_number!,
      document_issued_by: guest.document_issued_by ?? null,
    }

    const alloggiatiReservation: AlloggiatiReservation = {
      check_in: reservation.check_in,
      check_out: reservation.check_out,
    }

    // Generate the fixed-width record
    const fileContent = generateAlloggiatiRecord(
      alloggiatiGuest,
      alloggiatiReservation,
      true // primary guest
    )

    // Insert police_registrations record
    const { data: registration, error: insertError } = await supabase
      .from('police_registrations')
      .insert({
        entity_id: reservation.entity_id,
        booking_id: reservation.id,
        guest_id: guest.id,
        registration_date: new Date().toISOString().split('T')[0],
        last_name: guest.last_name,
        first_name: guest.first_name,
        gender: guest.gender === 'M' ? '1' : '2',
        date_of_birth: guest.date_of_birth,
        birth_place: guest.birth_place,
        birth_province: guest.birth_province ?? null,
        birth_country: guest.birth_country,
        citizenship: guest.citizenship,
        document_type: guest.document_type,
        document_number: guest.document_number,
        document_issued_by: guest.document_issued_by ?? null,
        is_primary: true,
        alloggiati_status: 'generated' as AlloggiatiStatus,
        file_content: fileContent,
      })
      .select('id')
      .single()

    if (insertError) {
      console.error(
        `Failed to create police registration for reservation ${reservation.id}: ${insertError.message}`
      )
      continue
    }

    registrations.push({
      id: registration.id,
      booking_id: reservation.id,
    })
  }

  revalidateCompliancePaths()
  return { registrations, skipped }
}

/**
 * Mark an Alloggiati registration as sent to the Questura portal.
 */
export async function markAlloggiatiSent(id: string) {
  if (!id) throw new Error('Registration id is required')

  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()
  const orgId = property?.id
  const now = new Date().toISOString()

  let query = supabase
    .from('police_registrations')
    .update({
      alloggiati_status: 'sent' as AlloggiatiStatus,
      sent_at: now,
      updated_at: now,
    })
    .eq('id', id)

  if (orgId) query = query.eq('entity_id', orgId)

  const { data: registration, error } = await query.select().single()

  if (error) throw new Error(`Failed to mark alloggiati as sent: ${error.message}`)

  revalidateCompliancePaths()
  return registration
}

// ---------------------------------------------------------------------------
// ISTAT Reporting Actions
// ---------------------------------------------------------------------------

/**
 * Generate (create) an ISTAT report record for a given month and year.
 *
 * Aggregates arrival and presence data from reservations for the given period,
 * distinguishing between Italian and foreign guests based on citizenship.
 */
export async function generateIstatReport(
  organizationId: string,
  month: number,
  year: number
) {
  if (!organizationId) throw new Error('organizationId is required')
  if (!month || month < 1 || month > 12) throw new Error('month must be between 1 and 12')
  if (!year || year < 2000) throw new Error('year is required and must be >= 2000')

  const supabase = await createServerSupabaseClient()

  // Calculate period boundaries
  const periodStart = `${year}-${String(month).padStart(2, '0')}-01`
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year
  const periodEnd = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`

  // Fetch reservations that overlap with this month (checked_in or checked_out)
  const { data: reservations } = await supabase
    .from('bookings')
    .select('id, check_in, check_out, adults, children, guest:guests(citizenship)')
    .eq('entity_id', organizationId)
    .in('status', ['checked_in', 'checked_out'])
    .lt('check_in', periodEnd)
    .gte('check_out', periodStart)

  let arrivalsItalian = 0
  let arrivalsForeign = 0
  let presencesItalian = 0
  let presencesForeign = 0
  const breakdown: Record<string, { arrivals: number; presences: number }> = {}

  if (reservations) {
    for (const res of reservations) {
      const guest = res.guest as unknown as { citizenship: string | null } | null
      const citizenship = guest?.citizenship ?? 'IT'
      const isItalian = citizenship === 'IT' || citizenship === 'Italia' || citizenship === 'italiana'
      const totalGuests = (res.adults ?? 1) + (res.children ?? 0)

      // Arrival: count if check_in falls within this month
      const checkIn = new Date(res.check_in)
      if (checkIn >= new Date(periodStart) && checkIn < new Date(periodEnd)) {
        if (isItalian) {
          arrivalsItalian += totalGuests
        } else {
          arrivalsForeign += totalGuests
        }
      }

      // Presences: count nights within this month
      const stayStart = new Date(Math.max(new Date(res.check_in).getTime(), new Date(periodStart).getTime()))
      const stayEnd = new Date(Math.min(new Date(res.check_out).getTime(), new Date(periodEnd).getTime()))
      const nightsInMonth = Math.max(
        0,
        Math.round((stayEnd.getTime() - stayStart.getTime()) / (1000 * 60 * 60 * 24))
      )
      const presences = nightsInMonth * totalGuests

      if (isItalian) {
        presencesItalian += presences
      } else {
        presencesForeign += presences
      }

      // Breakdown by nationality
      const country = citizenship || 'IT'
      if (!breakdown[country]) {
        breakdown[country] = { arrivals: 0, presences: 0 }
      }
      if (checkIn >= new Date(periodStart) && checkIn < new Date(periodEnd)) {
        breakdown[country].arrivals += totalGuests
      }
      breakdown[country].presences += presences
    }
  }

  const { data: report, error } = await supabase
    .from('istat_reports')
    .insert({
      entity_id: organizationId,
      month,
      year,
      arrivals_italian: arrivalsItalian,
      arrivals_foreign: arrivalsForeign,
      presences_italian: presencesItalian,
      presences_foreign: presencesForeign,
      breakdown,
      is_sent: false,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to generate ISTAT report: ${error.message}`)

  revalidateCompliancePaths()
  return report
}

// ---------------------------------------------------------------------------
// Tourist Tax Actions
// ---------------------------------------------------------------------------

/**
 * Mark a tourist tax record as collected.
 */
export async function collectTouristTax(recordId: string, paymentMethod?: PaymentMethod) {
  if (!recordId) throw new Error('Tourist tax record id is required')

  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()
  const orgId = property?.id
  const now = new Date().toISOString()

  let query = supabase
    .from('tourist_tax_records')
    .update({
      is_collected: true,
      collected_at: now,
      payment_method: paymentMethod ?? null,
    })
    .eq('id', recordId)

  if (orgId) query = query.eq('entity_id', orgId)

  const { data: record, error } = await query.select().single()

  if (error) throw new Error(`Failed to collect tourist tax: ${error.message}`)

  revalidateCompliancePaths()
  return record
}

// ---------------------------------------------------------------------------
// Tourist Tax Generation
// ---------------------------------------------------------------------------

/**
 * Auto-generate a tourist tax record for a reservation at check-in.
 * Calculates based on configured tourist_tax_rates, or uses a default rate.
 * Best-effort: errors are logged but don't block check-in.
 */
export async function generateTouristTaxForReservation(
  organizationId: string,
  reservationId: string
) {
  const supabase = await createServerSupabaseClient()

  // Fetch reservation details
  const { data: reservation, error: resError } = await supabase
    .from('bookings')
    .select('id, guest_id, check_in, check_out, adults, children')
    .eq('id', reservationId)
    .single()

  if (resError || !reservation) {
    console.error('[TouristTax] Prenotazione non trovata:', reservationId)
    return null
  }

  // Calculate nights
  const nights = Math.max(
    1,
    Math.round(
      (new Date(reservation.check_out).getTime() - new Date(reservation.check_in).getTime()) /
        (1000 * 60 * 60 * 24)
    )
  )

  // Look for configured rate
  const { data: rates } = await supabase
    .from('tourist_tax_rates')
    .select('*')
    .eq('entity_id', organizationId)
    .eq('is_active', true)
    .eq('is_exempt', false)
    .order('category')

  let ratePerPerson = 0
  let maxNights = nights

  if (rates && rates.length > 0) {
    // Use the 'standard' rate, or the first available rate
    const standardRate = rates.find((r: { category: string }) => r.category === 'standard') ?? rates[0]
    ratePerPerson = Number(standardRate.rate_per_person)
    if (standardRate.max_nights) {
      maxNights = Math.min(nights, standardRate.max_nights)
    }
  } else {
    // No rates configured — skip generation
    console.log('[TouristTax] Nessuna tariffa configurata, skip generazione')
    return null
  }

  if (ratePerPerson <= 0) return null

  const guestsCount = (reservation.adults ?? 1)
  const totalAmount = ratePerPerson * guestsCount * maxNights

  const { data: record, error: insertError } = await supabase
    .from('tourist_tax_records')
    .insert({
      entity_id: organizationId,
      reservation_id: reservationId,
      guest_id: reservation.guest_id,
      tax_date: reservation.check_in,
      nights: maxNights,
      guests_count: guestsCount,
      rate_per_person: ratePerPerson,
      total_amount: totalAmount,
      is_exempt: false,
      is_collected: false,
    })
    .select('id')
    .single()

  if (insertError) {
    console.error('[TouristTax] Errore creazione record:', insertError)
    return null
  }

  console.log(`[TouristTax] Record creato per prenotazione ${reservationId}: €${totalAmount}`)
  return record
}

// ---------------------------------------------------------------------------
// Audit Log
// ---------------------------------------------------------------------------

/**
 * Log an admin/staff action to the audit_logs table.
 * Fire-and-forget: errors are logged but never thrown.
 */
export async function logAdminAction(params: {
  organizationId: string
  userId?: string
  action: string
  entityType: string
  entityId?: string
  details?: Record<string, unknown>
}) {
  try {
    const supabase = await createServerSupabaseClient()

    await supabase.from('audit_logs').insert({
      tenant_id: params.organizationId,
      user_id: params.userId ?? null,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId ?? null,
      details: params.details ?? {},
      is_admin_access: true,
    })
  } catch (err) {
    console.error('[Audit] Errore log azione:', err)
  }
}

// ---------------------------------------------------------------------------
// AML (Anti-Money Laundering) Actions
// ---------------------------------------------------------------------------

/**
 * Create an AML cash record for regulatory compliance (D.Lgs. 231/2007).
 */
export async function createAmlRecord(data: CreateAmlRecordData) {
  if (!data.entity_id) throw new Error('entity_id is required')
  if (!data.guest_id) throw new Error('guest_id is required')
  if (!data.amount || data.amount <= 0) throw new Error('amount must be positive')
  if (!data.transaction_date) throw new Error('transaction_date is required')
  if (!data.guest_name) throw new Error('guest_name is required')

  const supabase = await createServerSupabaseClient()

  const { data: record, error } = await supabase
    .from('aml_cash_records')
    .insert({
      entity_id: data.entity_id,
      payment_id: data.payment_id ?? null,
      reservation_id: data.reservation_id ?? null,
      guest_id: data.guest_id,
      amount: data.amount,
      currency: data.currency ?? 'EUR',
      transaction_date: data.transaction_date,
      is_threshold_exceeded: data.is_threshold_exceeded ?? false,
      cumulative_cash_amount: data.cumulative_cash_amount ?? data.amount,
      guest_name: data.guest_name,
      guest_document_type: data.guest_document_type ?? null,
      guest_document_number: data.guest_document_number ?? null,
      guest_fiscal_code: data.guest_fiscal_code ?? null,
      guest_nationality: data.guest_nationality ?? null,
      verified_by: data.verified_by ?? null,
      verified_at: data.verified_at ?? null,
      verification_notes: data.verification_notes ?? null,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create AML record: ${error.message}`)

  revalidateCompliancePaths()
  return record
}

// ---------------------------------------------------------------------------
// Alloggiati Web — Auto-generation for a specific date (cron use)
// ---------------------------------------------------------------------------

export type AlloggiatiAutoSendMode = 'disabled' | 'always' | 'checkin_only'

interface AutoAlloggiatiResult {
  generated: number
  skipped: Array<{ booking_id: string; guest_name: string; reason: string }>
  already_existing: number
}

/**
 * Automatically generate Alloggiati records for all reservations with
 * check_in = date for a given organization.
 *
 * Uses service role client (no user auth needed — designed for cron jobs).
 *
 * @param organizationId - Organization UUID
 * @param date - Date string in YYYY-MM-DD format
 * @param mode - 'always' (all confirmed/checked_in) or 'checkin_only' (only checked_in)
 */
export async function generateAlloggiatiForDate(
  organizationId: string,
  date: string,
  mode: AlloggiatiAutoSendMode
): Promise<AutoAlloggiatiResult> {
  if (mode === 'disabled') {
    return { generated: 0, skipped: [], already_existing: 0 }
  }

  const supabase = await createServiceRoleClient()

  // Find reservations for this date
  let query = supabase
    .from('bookings')
    .select(`
      id,
      entity_id,
      check_in,
      check_out,
      status,
      guest_id,
      guests:guest_id (
        id,
        first_name,
        last_name,
        gender,
        date_of_birth,
        birth_place,
        birth_province,
        birth_country,
        citizenship,
        document_type,
        document_number,
        document_issued_by
      )
    `)
    .eq('entity_id', organizationId)
    .eq('check_in', date)

  // Filter by status based on mode
  if (mode === 'checkin_only') {
    query = query.eq('status', 'checked_in')
  } else {
    // 'always': include confirmed and checked_in
    query = query.in('status', ['confirmed', 'checked_in'])
  }

  const { data: reservations, error: fetchError } = await query

  if (fetchError) {
    throw new Error(`Failed to fetch reservations: ${fetchError.message}`)
  }

  if (!reservations || reservations.length === 0) {
    return { generated: 0, skipped: [], already_existing: 0 }
  }

  // Check which reservations already have a registration for today (idempotency)
  const reservationIds = reservations.map((r) => r.id)
  const { data: existingRegs } = await supabase
    .from('police_registrations')
    .select('booking_id')
    .in('booking_id', reservationIds)
    .eq('registration_date', date)

  const alreadyRegistered = new Set((existingRegs ?? []).map((r) => r.booking_id))

  const result: AutoAlloggiatiResult = {
    generated: 0,
    skipped: [],
    already_existing: alreadyRegistered.size,
  }

  for (const reservation of reservations) {
    // Skip if already has registration for this date
    if (alreadyRegistered.has(reservation.id)) continue

    const guest = reservation.guests as unknown as {
      id: string
      first_name: string
      last_name: string
      gender: string | null
      date_of_birth: string | null
      birth_place: string | null
      birth_province: string | null
      birth_country: string | null
      citizenship: string | null
      document_type: string | null
      document_number: string | null
      document_issued_by: string | null
    }

    const guestName = guest
      ? `${guest.first_name} ${guest.last_name}`
      : 'Ospite sconosciuto'

    if (!guest) {
      result.skipped.push({ booking_id: reservation.id, guest_name: guestName, reason: 'Dati ospite non trovati' })
      continue
    }

    // Validate required fields
    const missingFields: string[] = []
    if (!guest.date_of_birth) missingFields.push('data di nascita')
    if (!guest.birth_country) missingFields.push('stato di nascita')
    if (!guest.citizenship) missingFields.push('cittadinanza')
    if (!guest.document_type) missingFields.push('tipo documento')
    if (!guest.document_number) missingFields.push('numero documento')
    if (!guest.birth_place) missingFields.push('luogo di nascita')

    if (missingFields.length > 0) {
      result.skipped.push({
        booking_id: reservation.id,
        guest_name: guestName,
        reason: `Campi mancanti: ${missingFields.join(', ')}`,
      })
      continue
    }

    // Generate the fixed-width record
    const alloggiatiGuest: AlloggiatiGuest = {
      last_name: guest.last_name,
      first_name: guest.first_name,
      gender: (guest.gender === 'M' ? 'M' : 'F') as 'M' | 'F',
      date_of_birth: guest.date_of_birth!,
      birth_place: guest.birth_place!,
      birth_province: guest.birth_province ?? null,
      birth_country: guest.birth_country!,
      citizenship: guest.citizenship!,
      document_type: guest.document_type as AlloggiatiGuest['document_type'],
      document_number: guest.document_number!,
      document_issued_by: guest.document_issued_by ?? null,
    }

    const alloggiatiReservation: AlloggiatiReservation = {
      check_in: reservation.check_in,
      check_out: reservation.check_out,
    }

    let fileContent: string
    try {
      fileContent = generateAlloggiatiRecord(alloggiatiGuest, alloggiatiReservation, true)
    } catch (err) {
      result.skipped.push({
        booking_id: reservation.id,
        guest_name: guestName,
        reason: `Errore generazione: ${err instanceof Error ? err.message : String(err)}`,
      })
      continue
    }

    // Insert police_registration
    const { error: insertError } = await supabase
      .from('police_registrations')
      .insert({
        entity_id: organizationId,
        booking_id: reservation.id,
        guest_id: guest.id,
        registration_date: date,
        last_name: guest.last_name,
        first_name: guest.first_name,
        gender: guest.gender === 'M' ? '1' : '2',
        date_of_birth: guest.date_of_birth,
        birth_place: guest.birth_place,
        birth_province: guest.birth_province ?? null,
        birth_country: guest.birth_country,
        citizenship: guest.citizenship,
        document_type: guest.document_type,
        document_number: guest.document_number,
        document_issued_by: guest.document_issued_by ?? null,
        is_primary: true,
        alloggiati_status: 'generated' as AlloggiatiStatus,
        file_content: fileContent,
      })

    if (insertError) {
      result.skipped.push({
        booking_id: reservation.id,
        guest_name: guestName,
        reason: `Errore DB: ${insertError.message}`,
      })
      continue
    }

    result.generated++
  }

  return result
}
