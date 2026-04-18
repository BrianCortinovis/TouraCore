import { createServiceRoleClient, createServerSupabaseClient } from '@touracore/db'
import { computeQuote, type QuoteRequest } from './quote'
import { findNextAvailableBike } from './availability'
import type { BikeRentalReservationRow } from '../types/database'
import { DEFAULT_CURRENCY } from '../constants'

export interface CreateReservationInput extends QuoteRequest {
  guest: {
    name?: string
    email?: string
    phone?: string
    documentType?: string
    documentNumber?: string
    heightCm?: number
    weightKg?: number
    experience?: string
    guestId?: string
  }
  source?: string
  notesInternal?: string
  autoAssignBikes?: boolean
  /** Use service role for public booking (no auth). */
  usePublicClient?: boolean
}

export interface CreateReservationResult {
  success: boolean
  reservationId?: string
  referenceCode?: string
  quote?: Awaited<ReturnType<typeof computeQuote>>
  error?: string
}

export async function createReservation(
  input: CreateReservationInput,
): Promise<CreateReservationResult> {
  try {
    const quote = await computeQuote(input)

    const supabase = input.usePublicClient
      ? await createServiceRoleClient()
      : await createServerSupabaseClient()

    // Fetch bike_rental to get tenant_id
    const { data: br } = await supabase
      .from('bike_rentals')
      .select('id, tenant_id')
      .eq('id', input.bikeRentalId)
      .maybeSingle()
    if (!br) return { success: false, error: 'bike_rental not found' }

    const tenantId = (br as { tenant_id: string }).tenant_id
    const referenceCode = `BK-${new Date().getFullYear()}-${Math.floor(Math.random() * 1_000_000)
      .toString()
      .padStart(6, '0')}`

    const { data: reservation, error: resErr } = await supabase
      .from('bike_rental_reservations')
      .insert({
        bike_rental_id: input.bikeRentalId,
        tenant_id: tenantId,
        reference_code: referenceCode,
        guest_id: input.guest.guestId ?? null,
        guest_name: input.guest.name ?? null,
        guest_email: input.guest.email ?? null,
        guest_phone: input.guest.phone ?? null,
        guest_document_type: input.guest.documentType ?? null,
        guest_document_number: input.guest.documentNumber ?? null,
        guest_height_cm: input.guest.heightCm ?? null,
        guest_weight_kg: input.guest.weightKg ?? null,
        guest_experience: input.guest.experience ?? null,
        rental_start: input.rentalStart,
        rental_end: input.rentalEnd,
        pickup_location_id: input.pickupLocationId ?? null,
        return_location_id: input.returnLocationId ?? null,
        delivery_address: input.deliveryAddress ?? null,
        delivery_km: input.deliveryKm ?? null,
        subtotal: quote.subtotal,
        addons_total: quote.addonsTotal,
        delivery_fee: quote.deliveryFee,
        one_way_fee: quote.oneWayFee,
        discount: quote.discount,
        tax_amount: quote.taxAmount,
        total_amount: quote.totalAmount,
        paid_amount: 0,
        currency: quote.currency ?? DEFAULT_CURRENCY,
        deposit_amount: quote.depositAmount,
        insurance_tier: quote.insuranceTier,
        status: 'pending',
        source: input.source ?? 'direct',
        notes_internal: input.notesInternal ?? null,
      })
      .select('id, reference_code')
      .maybeSingle()

    if (resErr || !reservation) {
      return { success: false, error: resErr?.message ?? 'failed to create reservation' }
    }

    const reservationId = (reservation as { id: string; reference_code: string }).id

    // Items (one row per rider)
    const itemInserts: Array<Record<string, unknown>> = []
    for (const item of input.items) {
      const assignedBikeId = input.autoAssignBikes
        ? await findNextAvailableBike({
            bikeRentalId: input.bikeRentalId,
            bikeType: item.bikeTypeKey as never,
            rentalStart: input.rentalStart,
            rentalEnd: input.rentalEnd,
            locationId: input.pickupLocationId,
          })
        : null
      const line = quote.lines.find((l) => l.bikeTypeId === item.bikeTypeId)
      for (let n = 0; n < item.quantity; n++) {
        itemInserts.push({
          reservation_id: reservationId,
          tenant_id: tenantId,
          bike_id: n === 0 ? assignedBikeId : null, // assegna primo, altri manuali
          bike_type: item.bikeTypeKey,
          rider_height_cm: item.riderHeight ?? null,
          rider_age: item.riderAge ?? null,
          base_price: line?.baseUnitRate ?? 0,
          line_total: line ? line.adjustedUnitRate : 0,
        })
      }
    }
    if (itemInserts.length > 0) {
      await supabase.from('bike_rental_reservation_items').insert(itemInserts)
    }

    // Addons
    const addonInserts = quote.addonsLines.map((a) => ({
      reservation_id: reservationId,
      tenant_id: tenantId,
      addon_key: a.addonKey,
      addon_label: a.label,
      quantity: a.quantity,
      unit_price: a.unitPrice,
      line_total: a.lineTotal,
    }))
    if (addonInserts.length > 0) {
      await supabase.from('bike_rental_reservation_addons').insert(addonInserts)
    }

    return {
      success: true,
      reservationId,
      referenceCode: (reservation as { reference_code: string }).reference_code,
      quote,
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { success: false, error: msg }
  }
}

export async function cancelReservation(params: {
  reservationId: string
  reason?: string
}): Promise<boolean> {
  const supabase = await createServerSupabaseClient()
  const patch: Partial<BikeRentalReservationRow> = { status: 'cancelled' }
  if (params.reason) patch.notes_internal = params.reason
  const { error } = await supabase
    .from('bike_rental_reservations')
    .update(patch)
    .eq('id', params.reservationId)
  return !error
}
