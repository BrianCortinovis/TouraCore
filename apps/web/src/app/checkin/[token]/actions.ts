'use server'

import { createServiceRoleClient } from '@touracore/db/server'

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
  amountCents: number
}): Promise<{ ok: boolean; error?: string; clientSecret?: string; intentId?: string }> {
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

  const res = await fetch('https://api.stripe.com/v1/payment_intents', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${stripeKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      amount: String(input.amountCents),
      currency: 'eur',
      'automatic_payment_methods[enabled]': 'true',
      description: `Tassa di soggiorno · check-in ${input.token.slice(0, 8)}`,
      'metadata[flow]': 'tourist_tax',
      'metadata[checkin_token]': input.token,
      'metadata[entity_id]': checkinToken.entity_id,
      'metadata[reservation_id]': checkinToken.reservation_id ?? '',
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
      tourist_tax_amount_cents: input.amountCents,
      tourist_tax_payment_intent_id: pi.id,
    })
    .eq('id', checkinToken.id)

  return { ok: true, clientSecret: pi.client_secret, intentId: pi.id }
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
