'use server'

import { createServiceRoleClient } from '@touracore/db/server'
import { buildConnectChargeParamsSafe } from '@touracore/billing/server'

export async function uploadDocumentScanAction(input: {
  token: string
  kind: 'id_front' | 'id_back' | 'passport' | 'license'
  mimeType: string
  base64: string
}): Promise<{ ok: boolean; error?: string; storagePath?: string }> {
  const supabase = await createServiceRoleClient()

  const { data: checkinToken } = await supabase
    .from('checkin_tokens')
    .select('id, entity_id, reservation_id, status, expires_at')
    .eq('token', input.token)
    .maybeSingle()

  if (!checkinToken) return { ok: false, error: 'token_not_found' }
  if (checkinToken.status === 'completed' || checkinToken.status === 'expired') {
    return { ok: false, error: 'token_not_valid' }
  }
  if (new Date(checkinToken.expires_at) < new Date()) return { ok: false, error: 'token_expired' }

  // Validate base64 + size (max 5MB raw)
  const raw = Buffer.from(input.base64, 'base64')
  if (raw.length > 5 * 1024 * 1024) return { ok: false, error: 'file_too_large' }
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(input.mimeType)) {
    return { ok: false, error: 'invalid_mime' }
  }

  const ext = input.mimeType.split('/')[1]
  const storagePath = `${checkinToken.entity_id}/${checkinToken.id}/${input.kind}-${Date.now()}.${ext}`

  const { error: uploadErr } = await supabase.storage
    .from('guest-documents')
    .upload(storagePath, raw, { contentType: input.mimeType, upsert: false })

  if (uploadErr) return { ok: false, error: uploadErr.message }

  await supabase.from('document_scans').insert({
    entity_id: checkinToken.entity_id,
    reservation_id: checkinToken.reservation_id,
    checkin_token_id: checkinToken.id,
    kind: input.kind,
    storage_path: storagePath,
    mime_type: input.mimeType,
    size_bytes: raw.length,
    retention_expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  })

  const urlField = input.kind === 'id_back' ? 'document_back_url' : 'document_front_url'
  await supabase
    .from('checkin_tokens')
    .update({ [urlField]: storagePath })
    .eq('id', checkinToken.id)

  return { ok: true, storagePath }
}

export async function createTouristTaxPaymentIntentAction(input: {
  token: string
}): Promise<{ ok: boolean; error?: string; clientSecret?: string; intentId?: string; amountCents?: number }> {
  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey) return { ok: false, error: 'stripe_not_configured' }

  const supabase = await createServiceRoleClient()
  const { data: checkinToken } = await supabase
    .from('checkin_tokens')
    .select('id, entity_id, reservation_id, tourist_tax_payment_intent_id, tourist_tax_paid_at')
    .eq('token', input.token)
    .maybeSingle()

  if (!checkinToken) return { ok: false, error: 'token_not_found' }
  if (checkinToken.tourist_tax_paid_at) return { ok: false, error: 'already_paid' }
  if (!checkinToken.reservation_id) return { ok: false, error: 'no_reservation_linked' }

  // Server-side recompute amount: rate_per_person × ospiti × notti tassate.
  // Mai trustare amount dal client.
  const { data: reservation } = await supabase
    .from('reservations')
    .select('id, tenant_id, entity_id, adults, children, check_in, check_out')
    .eq('id', checkinToken.reservation_id)
    .maybeSingle()
  if (!reservation) return { ok: false, error: 'reservation_not_found' }

  const { data: accommodation } = await supabase
    .from('accommodations')
    .select('entity_id, tourist_tax_enabled, tourist_tax_max_nights')
    .eq('entity_id', checkinToken.entity_id)
    .maybeSingle()
  if (!accommodation?.tourist_tax_enabled) return { ok: false, error: 'tourist_tax_not_enabled' }

  const { data: rates } = await supabase
    .from('tourist_tax_rates')
    .select('category, rate_per_person, is_exempt, is_active, max_nights')
    .eq('entity_id', checkinToken.entity_id)
    .eq('is_active', true)
  if (!rates || rates.length === 0) return { ok: false, error: 'tourist_tax_rates_not_configured' }

  const checkIn = new Date(reservation.check_in)
  const checkOut = new Date(reservation.check_out)
  const nights = Math.max(0, Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)))
  const maxNights = Math.min(
    accommodation.tourist_tax_max_nights ?? Infinity,
    ...rates.map((r) => r.max_nights ?? Infinity).filter((n) => n !== null),
  )
  const taxedNights = Math.min(nights, isFinite(maxNights) ? maxNights : nights)

  const adultRate = rates.find((r) => r.category === 'adult' && !r.is_exempt)?.rate_per_person ?? 0
  const childRate = rates.find((r) => r.category === 'child' && !r.is_exempt)?.rate_per_person ?? 0

  const adultsAmount = Number(adultRate) * (reservation.adults ?? 0) * taxedNights
  const childrenAmount = Number(childRate) * (reservation.children ?? 0) * taxedNights
  const computedAmountCents = Math.round((adultsAmount + childrenAmount) * 100)

  if (computedAmountCents <= 0) return { ok: false, error: 'no_amount_due' }

  // Connect Direct Charge: tassa di soggiorno è incassata dal tenant, non dalla piattaforma.
  const connectParams = await buildConnectChargeParamsSafe({
    tenantId: reservation.tenant_id,
    moduleCode: 'tourist_tax',
    baseAmountCents: computedAmountCents,
  })
  if (!connectParams) {
    return { ok: false, error: 'tenant_stripe_connect_not_ready' }
  }

  const res = await fetch('https://api.stripe.com/v1/payment_intents', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${stripeKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      amount: String(computedAmountCents),
      currency: 'eur',
      'automatic_payment_methods[enabled]': 'true',
      'application_fee_amount': String(connectParams.application_fee_amount),
      'on_behalf_of': connectParams.on_behalf_of,
      'transfer_data[destination]': connectParams.transfer_data.destination,
      description: `Tassa di soggiorno · check-in ${input.token.slice(0, 8)}`,
      'metadata[flow]': 'tourist_tax',
      'metadata[checkin_token]': input.token,
      'metadata[entity_id]': checkinToken.entity_id,
      'metadata[reservation_id]': checkinToken.reservation_id ?? '',
      'metadata[adults]': String(reservation.adults ?? 0),
      'metadata[children]': String(reservation.children ?? 0),
      'metadata[nights_taxed]': String(taxedNights),
    }).toString(),
  })

  if (!res.ok) {
    const err = await res.text()
    return { ok: false, error: `stripe_error: ${err.slice(0, 150)}` }
  }

  const pi = (await res.json()) as { id: string; client_secret: string }
  await supabase
    .from('checkin_tokens')
    .update({
      tourist_tax_amount_cents: computedAmountCents,
      tourist_tax_payment_intent_id: pi.id,
    })
    .eq('id', checkinToken.id)

  return { ok: true, clientSecret: pi.client_secret, intentId: pi.id, amountCents: computedAmountCents }
}

export async function setTaxPaymentChoiceAction(input: {
  token: string
  choice: 'online' | 'onsite'
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createServiceRoleClient()
  const { error } = await supabase
    .from('checkin_tokens')
    .update({ tourist_tax_payment_choice: input.choice })
    .eq('token', input.token)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function markTouristTaxPaidAction(input: {
  token: string
  paymentIntentId: string
}): Promise<{ ok: boolean; error?: string }> {
  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey) return { ok: false, error: 'stripe_not_configured' }

  // Verify intent status with Stripe
  const res = await fetch(`https://api.stripe.com/v1/payment_intents/${input.paymentIntentId}`, {
    headers: { Authorization: `Bearer ${stripeKey}` },
  })
  if (!res.ok) return { ok: false, error: 'stripe_lookup_failed' }
  const pi = (await res.json()) as { status: string; metadata?: { checkin_token?: string } }
  if (pi.status !== 'succeeded') return { ok: false, error: `status_${pi.status}` }
  if (pi.metadata?.checkin_token !== input.token) return { ok: false, error: 'token_mismatch' }

  const supabase = await createServiceRoleClient()
  await supabase
    .from('checkin_tokens')
    .update({ tourist_tax_paid_at: new Date().toISOString() })
    .eq('token', input.token)

  return { ok: true }
}
