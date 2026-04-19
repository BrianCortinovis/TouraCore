'use server'

import { createServiceRoleClient } from '@touracore/db/server'

export async function uploadCheckoutPhotoAction(input: {
  token: string
  mimeType: string
  base64: string
}): Promise<{ ok: boolean; error?: string; storagePath?: string }> {
  const supabase = await createServiceRoleClient()
  const { data: tk } = await supabase
    .from('checkout_tokens')
    .select('id, entity_id, booking_id, status, expires_at, damage_photos')
    .eq('token', input.token)
    .maybeSingle()
  if (!tk) return { ok: false, error: 'token_not_found' }
  if (tk.status === 'completed' || tk.status === 'expired') return { ok: false, error: 'token_not_valid' }
  if (new Date(tk.expires_at) < new Date()) return { ok: false, error: 'token_expired' }

  const raw = Buffer.from(input.base64, 'base64')
  if (raw.length > 5 * 1024 * 1024) return { ok: false, error: 'file_too_large' }
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(input.mimeType)) return { ok: false, error: 'invalid_mime' }

  const ext = input.mimeType.split('/')[1]
  const storagePath = `${tk.entity_id}/${tk.id}/checkout-damage-${Date.now()}.${ext}`

  const { error: upErr } = await supabase.storage
    .from('guest-documents')
    .upload(storagePath, raw, { contentType: input.mimeType, upsert: false })
  if (upErr) return { ok: false, error: upErr.message }

  const existing = Array.isArray(tk.damage_photos) ? (tk.damage_photos as string[]) : []
  await supabase
    .from('checkout_tokens')
    .update({ damage_photos: [...existing, storagePath] })
    .eq('id', tk.id)

  await supabase.from('document_scans').insert({
    entity_id: tk.entity_id,
    reservation_id: tk.booking_id,
    checkout_token_id: tk.id,
    kind: 'other',
    storage_path: storagePath,
    mime_type: input.mimeType,
    size_bytes: raw.length,
    retention_expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  })

  return { ok: true, storagePath }
}

export async function completeCheckoutAction(input: {
  token: string
  rating: number
  comment: string | null
  damageReported: boolean
  damageDescription: string | null
  signatureDataUrl: string
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createServiceRoleClient()
  const { data: tk } = await supabase
    .from('checkout_tokens')
    .select('id, status, expires_at')
    .eq('token', input.token)
    .maybeSingle()
  if (!tk) return { ok: false, error: 'token_not_found' }
  if (tk.status === 'completed' || tk.status === 'expired') return { ok: false, error: 'token_not_valid' }
  if (new Date(tk.expires_at) < new Date()) return { ok: false, error: 'token_expired' }

  if (input.rating < 1 || input.rating > 5) return { ok: false, error: 'invalid_rating' }
  if (input.signatureDataUrl.length < 100) return { ok: false, error: 'signature_required' }

  const { error } = await supabase
    .from('checkout_tokens')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      feedback_rating: input.rating,
      feedback_comment: input.comment,
      damage_reported: input.damageReported,
      damage_description: input.damageDescription,
      signature_data_url: input.signatureDataUrl,
    })
    .eq('id', tk.id)

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}
