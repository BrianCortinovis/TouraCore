import { randomInt } from 'node:crypto'
import { createServiceRoleClient, createServerSupabaseClient } from '@touracore/db'
import { redeemCredit } from '@touracore/vouchers/server'
import { attributeCommission } from '@touracore/partners/server'
import { defaultVatRate } from '@touracore/fiscal'
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
  /** Voucher / gift card / promo code — atomic redeem post-insert */
  voucherCode?: string
  /** Partner referral code (URL ?ref=XXX or embed ref) — attribuisce commission */
  partnerRef?: string
  /** Actor IP for rate limit + audit on voucher redeem */
  actorIp?: string
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

    // P0 #5: gate atomico anti-overbooking per ogni tipo bici richiesto.
    // Recheck sotto advisory lock prima dell'insert.
    for (const item of input.items) {
      const { data: gateRows, error: gateErr } = await supabase.rpc(
        'bike_rental_check_availability',
        {
          p_bike_rental_id: input.bikeRentalId,
          p_bike_type: item.bikeTypeKey,
          p_rental_start: input.rentalStart,
          p_rental_end: input.rentalEnd,
          p_quantity: item.quantity,
        },
      )
      if (gateErr) {
        return { success: false, error: `availability check failed: ${gateErr.message}` }
      }
      const row = Array.isArray(gateRows) ? gateRows[0] : gateRows
      if (!row || !(row as { has_capacity: boolean }).has_capacity) {
        return { success: false, error: `bici "${item.bikeTypeKey}" non disponibili per la finestra richiesta` }
      }
    }

    // CSPRNG: reference code visible al cliente, no collisioni accidentali
    const referenceCode = `BK-${new Date().getFullYear()}-${String(randomInt(100000, 1000000))}`

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
      const { error: itemsErr } = await supabase
        .from('bike_rental_reservation_items')
        .insert(itemInserts)
      if (itemsErr) {
        // Rollback parent reservation per evitare riga orfana senza items.
        await supabase.from('bike_rental_reservations').delete().eq('id', reservationId)
        return { success: false, error: `items insert failed: ${itemsErr.message}` }
      }
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
      const { error: addonsErr } = await supabase
        .from('bike_rental_reservation_addons')
        .insert(addonInserts)
      if (addonsErr) {
        await supabase.from('bike_rental_reservation_items').delete().eq('reservation_id', reservationId)
        await supabase.from('bike_rental_reservations').delete().eq('id', reservationId)
        return { success: false, error: `addons insert failed: ${addonsErr.message}` }
      }
    }

    // Voucher / gift card / promo — atomic redeem con idempotency_key = reservationId
    let finalDiscount = quote.discount
    let finalTotal = quote.totalAmount
    if (input.voucherCode) {
      const baseAmount = quote.subtotal + quote.addonsTotal + quote.insuranceAmount + quote.oneWayFee + quote.deliveryFee
      const redeemResult = await redeemCredit(
        {
          code: input.voucherCode,
          tenantId,
          amount: baseAmount,
          reservationId,
          reservationTable: 'bike_rental_reservations',
          vertical: 'bike_rental',
          entityId: input.bikeRentalId,
          idempotencyKey: reservationId,
          actorIp: input.actorIp,
        },
        { useServiceRole: Boolean(input.usePublicClient) },
      )
      if (redeemResult.success && redeemResult.amount_applied) {
        finalDiscount = quote.discount + redeemResult.amount_applied
        // Ricalcolo tax + total con discount aggiornato (VAT centralizzato in @touracore/fiscal)
        const taxable = baseAmount - finalDiscount
        const vatRate = defaultVatRate('bike_rental')
        const taxAmount = Math.round(taxable * (vatRate / 100) * 100) / 100
        finalTotal = Math.round((taxable + taxAmount) * 100) / 100
        await supabase
          .from('bike_rental_reservations')
          .update({
            discount: finalDiscount,
            tax_amount: taxAmount,
            total_amount: finalTotal,
          })
          .eq('id', reservationId)
      }
    }

    // Partner commission attribution (se ref presente)
    if (input.partnerRef) {
      try {
        await attributeCommission({
          tenantId,
          partnerCode: input.partnerRef,
          reservationId,
          reservationTable: 'bike_rental_reservations',
          vertical: 'bike_rental',
          bookingAmount: finalTotal,
          currency: quote.currency ?? DEFAULT_CURRENCY,
          sourceType: 'url',
          idempotencyKey: `bike:${reservationId}`,
          useServiceRole: Boolean(input.usePublicClient),
        })
      } catch (commErr) {
        // Log silenzioso — non bloccare booking se attribution fail
        console.error('partner commission attribution failed', commErr)
      }
    }

    if (input.guest?.email) {
      try {
        const refCode = (reservation as { reference_code: string }).reference_code
        const { data: entityRow } = await supabase
          .from('entities')
          .select('name')
          .eq('id', input.bikeRentalId)
          .maybeSingle()
        const entityName = (entityRow?.name as string) ?? 'il punto noleggio'
        const bikesSummary = input.items.map((i) => `${i.quantity}× ${i.bikeTypeKey}`).join(', ')
        const subject = `Noleggio bici confermato — ${refCode}`

        // HTML branded inline (same shell come email-templates.ts ma duplicato perché package non può importare apps/web)
        const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
        const guestName = input.guest.name ?? ''
        const html = `<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background-color:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;"><table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" width="100%" style="max-width:560px;margin:32px auto;background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e7e5e4;"><tr><td style="padding:32px 40px;background-color:#1c1917;color:#fafaf9;"><div style="font-size:11px;letter-spacing:2px;color:#a8a29e;font-weight:600;">TOURACORE</div><div style="font-size:11px;color:#a8a29e;margin-top:4px;">TOURISM PLATFORM</div></td></tr><tr><td style="padding:40px;color:#1c1917;line-height:1.5;"><h1 style="font-size:22px;margin:0 0 8px 0;color:#1c1917;font-weight:700;">Noleggio bici confermato</h1><p style="margin:0 0 24px 0;color:#44403c;">Ciao ${escapeHtml(guestName)}, il tuo noleggio è confermato.</p><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse;"><tr><td style="padding:8px 0;color:#78716c;font-size:13px;">Codice</td><td style="padding:8px 0;font-weight:600;text-align:right;">${escapeHtml(refCode)}</td></tr><tr><td style="padding:8px 0;color:#78716c;font-size:13px;">Punto noleggio</td><td style="padding:8px 0;font-weight:600;text-align:right;">${escapeHtml(entityName)}</td></tr><tr><td style="padding:8px 0;color:#78716c;font-size:13px;">Ritiro</td><td style="padding:8px 0;font-weight:600;text-align:right;">${escapeHtml(input.rentalStart)}</td></tr><tr><td style="padding:8px 0;color:#78716c;font-size:13px;">Restituzione</td><td style="padding:8px 0;font-weight:600;text-align:right;">${escapeHtml(input.rentalEnd)}</td></tr><tr><td style="padding:8px 0;color:#78716c;font-size:13px;">Bici</td><td style="padding:8px 0;font-weight:600;text-align:right;">${escapeHtml(bikesSummary)}</td></tr><tr><td style="padding:8px 0;color:#78716c;font-size:13px;">Totale</td><td style="padding:8px 0;font-weight:600;text-align:right;">${finalTotal.toFixed(2)} ${escapeHtml(quote.currency ?? 'EUR')}</td></tr></table><p style="margin:32px 0 0 0;color:#44403c;font-size:14px;">Presentati al pickup con un documento valido. Buon noleggio!</p></td></tr><tr><td style="padding:24px 40px;background-color:#fafaf9;border-top:1px solid #e7e5e4;font-size:13px;color:#78716c;"><p style="margin:0 0 8px 0;">Hai bisogno d'aiuto? Scrivi a <a href="mailto:info@touracore.com" style="color:#0f766e;text-decoration:none;">info@touracore.com</a></p><p style="margin:0;font-size:11px;color:#a8a29e;">© TouraCore — Piattaforma multi-vertical per il turismo italiano.</p></td></tr></table></body></html>`

        await supabase.from('message_queue').insert({
          entity_id: input.bikeRentalId,
          reservation_id: null,
          guest_id: null,
          channel: 'email',
          recipient: input.guest.email,
          subject,
          body: html,
          scheduled_for: new Date().toISOString(),
          status: 'pending',
          attempts: 0,
        })
      } catch (mqErr) {
        console.error('bike enqueue confirmation email failed', mqErr)
      }
    }

    return {
      success: true,
      reservationId,
      referenceCode: (reservation as { reference_code: string }).reference_code,
      quote: { ...quote, discount: finalDiscount, totalAmount: finalTotal },
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
