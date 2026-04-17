'use server'

import { createServerSupabaseClient } from '@touracore/db/server'
import type { BookingTemplate, BookingTheme } from '@touracore/hospitality/src/components/booking'
import { generateApiKey } from '../../../../../api/public/booking/_shared'

export async function saveBookingEngineConfig(input: {
  entityId: string
  template: BookingTemplate
  theme: BookingTheme
}) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('accommodations')
    .update({
      booking_template: input.template,
      booking_theme: input.theme as unknown as Record<string, unknown>,
      updated_at: new Date().toISOString(),
    })
    .eq('entity_id', input.entityId)

  if (error) {
    return { success: false, error: error.message }
  }
  return { success: true }
}

export async function createPublicApiKey(input: {
  entityId: string
  name: string
  allowedDomains: string[]
}) {
  const supabase = await createServerSupabaseClient()

  const { data: entity } = await supabase
    .from('entities')
    .select('tenant_id')
    .eq('id', input.entityId)
    .single()
  if (!entity) return { success: false, error: 'Entity not found' }

  const { prefix, fullKey, keyHash } = generateApiKey()

  const { error } = await supabase.from('public_booking_keys').insert({
    entity_id: input.entityId,
    tenant_id: entity.tenant_id,
    key_prefix: prefix,
    key_hash: keyHash,
    name: input.name,
    allowed_domains: input.allowedDomains,
    scopes: ['availability.read', 'booking.create'],
    is_active: true,
  })

  if (error) return { success: false, error: error.message }
  return { success: true, fullKey, prefix }
}

export async function revokePublicApiKey(keyId: string) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('public_booking_keys')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', keyId)
  if (error) return { success: false, error: error.message }
  return { success: true }
}
