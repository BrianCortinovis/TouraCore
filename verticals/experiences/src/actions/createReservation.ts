import { createServerSupabaseClient, createServiceRoleClient } from '@touracore/db'
import { randomUUID } from 'node:crypto'

export interface CreateReservationInput {
  tenantId: string
  entityId: string
  productId: string
  timeslotId?: string | null
  customerName: string
  customerEmail?: string
  customerPhone?: string
  customerLanguage?: string
  startAt: string
  endAt: string
  guests: Array<{
    variantId?: string
    firstName?: string
    lastName?: string
    email?: string
    phone?: string
    dateOfBirth?: string
    customFieldsValues?: Record<string, unknown>
  }>
  addons?: Array<{ addonId: string; quantity: number; unitPriceCents: number }>
  subtotalCents: number
  addonsCents: number
  pickupCents: number
  discountCents: number
  taxCents: number
  totalCents: number
  depositCents?: number
  currency?: string
  source?: string
  partnerId?: string
  voucherCode?: string
  pickupZoneId?: string
  pickupAddress?: string
  notes?: string
}

export async function createReservation(input: CreateReservationInput): Promise<{ id: string; reference_code: string }> {
  // Use service role per booking anon flow (public widget)
  const supabase = await createServiceRoleClient()

  // Atomic timeslot booking
  if (input.timeslotId) {
    const seats = input.guests.length
    const { data: booked, error: bookErr } = await supabase.rpc('experience_timeslot_try_book', {
      p_timeslot_id: input.timeslotId,
      p_seats: seats,
    })
    if (bookErr) throw bookErr
    if (booked !== true) throw new Error('Timeslot capacity exhausted')
  }

  const refCode = `EXP-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 4).toUpperCase()}`

  const { data: reservation, error: resErr } = await supabase
    .from('experience_reservations')
    .insert({
      tenant_id: input.tenantId,
      entity_id: input.entityId,
      product_id: input.productId,
      timeslot_id: input.timeslotId ?? null,
      reference_code: refCode,
      customer_name: input.customerName,
      customer_email: input.customerEmail,
      customer_phone: input.customerPhone,
      customer_language: input.customerLanguage ?? 'it',
      start_at: input.startAt,
      end_at: input.endAt,
      guests_count: input.guests.length,
      subtotal_cents: input.subtotalCents,
      addons_cents: input.addonsCents,
      pickup_cents: input.pickupCents,
      discount_cents: input.discountCents,
      tax_cents: input.taxCents,
      total_cents: input.totalCents,
      deposit_cents: input.depositCents ?? 0,
      balance_due_cents: input.totalCents - (input.depositCents ?? 0),
      currency: input.currency ?? 'EUR',
      source: input.source ?? 'direct',
      partner_id: input.partnerId,
      voucher_code: input.voucherCode,
      pickup_zone_id: input.pickupZoneId,
      pickup_address: input.pickupAddress,
      notes: input.notes,
      status: 'pending',
      payment_status: 'unpaid',
    })
    .select('id, reference_code')
    .single()

  if (resErr) throw resErr

  const reservationId = (reservation as { id: string }).id

  if (input.guests.length > 0) {
    const guestRows = input.guests.map((g) => ({
      reservation_id: reservationId,
      tenant_id: input.tenantId,
      variant_id: g.variantId ?? null,
      first_name: g.firstName,
      last_name: g.lastName,
      email: g.email,
      phone: g.phone,
      date_of_birth: g.dateOfBirth ?? null,
      custom_fields_values: g.customFieldsValues ?? {},
      check_in_qr: randomUUID(),
    }))
    const { error: gErr } = await supabase.from('experience_reservation_guests').insert(guestRows)
    if (gErr) throw gErr
  }

  if (input.addons && input.addons.length > 0) {
    const addonRows = input.addons.map((a) => ({
      reservation_id: reservationId,
      addon_id: a.addonId,
      tenant_id: input.tenantId,
      quantity: a.quantity,
      unit_price_cents: a.unitPriceCents,
      line_total_cents: a.unitPriceCents * a.quantity,
    }))
    const { error: aErr } = await supabase.from('experience_reservation_addons').insert(addonRows)
    if (aErr) throw aErr
  }

  return reservation as { id: string; reference_code: string }
}
