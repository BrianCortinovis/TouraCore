'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@touracore/db/server'
import { encrypt } from '@touracore/db/crypto'
import { z } from 'zod'

interface ActionResult {
  success: boolean
  error?: string
  data?: unknown
}

const entitySchema = z.object({
  name: z.string().min(1),
  slug: z.string().optional(),
  is_active: z.boolean().optional(),
  country_override: z.string().optional(),
})

const accommodationSchema = z.object({
  property_type: z.string().optional(),
  is_imprenditoriale: z.boolean().optional(),
  legal_name: z.string().optional(),
  vat_number: z.string().optional(),
  fiscal_code: z.string().optional(),
  short_description: z.string().optional(),
  description: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  region: z.string().optional(),
  zip: z.string().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  pec: z.string().optional(),
  website: z.string().optional(),
  default_check_in_time: z.string().optional(),
  default_check_out_time: z.string().optional(),
  amenities: z.array(z.string()).optional(),
  star_rating: z.number().int().min(0).max(5).nullable().optional(),
  fiscal_regime: z.enum(['ordinario', 'forfettario', 'cedolare_secca', 'agriturismo_special']).optional(),
  has_vat: z.boolean().optional(),
  default_vat_rate: z.number().min(0).max(100).optional(),
  cedolare_secca_enabled: z.boolean().optional(),
  cedolare_secca_rate: z.number().min(0).max(100).optional(),
  ritenuta_ota_enabled: z.boolean().optional(),
  ritenuta_ota_rate: z.number().min(0).max(100).optional(),
  sdi_code: z.string().max(7).optional(),
  invoice_prefix: z.string().optional(),
  invoice_next_number: z.number().int().min(1).optional(),
  cin_code: z.string().optional(),
  cin_expiry: z.string().optional(),
  scia_number: z.string().optional(),
  scia_status: z.enum(['pending', 'approved', 'expired']).optional(),
  scia_expiry: z.string().optional(),
  alloggiati_username: z.string().optional(),
  alloggiati_password: z.string().optional(),
  istat_structure_code: z.string().optional(),
  pet_policy: z.object({
    allowed: z.boolean(),
    max_pets: z.number().int().optional(),
    fee_per_night: z.number().optional(),
    notes: z.string().optional(),
  }).optional(),
  cancellation_policy: z.object({
    type: z.string(),
    days_before: z.number().int(),
    penalty_percent: z.number().int(),
  }).optional(),
  payment_methods: z.array(z.string()).optional(),
  smoking_allowed: z.boolean().optional(),
  children_allowed: z.boolean().optional(),
  parties_allowed: z.boolean().optional(),
  quiet_hours_start: z.string().optional(),
  quiet_hours_end: z.string().optional(),
  house_rules_notes: z.string().optional(),
})

export async function updateEntitySettingsAction(
  entityId: string,
  entityData: z.infer<typeof entitySchema>,
  accommodationData: z.infer<typeof accommodationSchema>
): Promise<ActionResult> {
  const entityParsed = entitySchema.safeParse(entityData)
  if (!entityParsed.success) {
    return { success: false, error: `Dati entità non validi: ${entityParsed.error.message}` }
  }

  const accParsed = accommodationSchema.safeParse(accommodationData)
  if (!accParsed.success) {
    return { success: false, error: `Dati struttura non validi: ${accParsed.error.message}` }
  }

  const supabase = await createServerSupabaseClient()

  const { error: entityError } = await supabase
    .from('entities')
    .update({
      name: entityParsed.data.name,
      slug: entityParsed.data.slug,
      is_active: entityParsed.data.is_active,
      country_override: entityParsed.data.country_override,
      updated_at: new Date().toISOString(),
    })
    .eq('id', entityId)

  if (entityError) {
    console.error('[settings] entity update failed', { entityId, error: entityError.message })
    return { success: false, error: entityError.message }
  }

  const { alloggiati_password, ...restAccData } = accParsed.data

  const updatePayload: Record<string, unknown> = { ...restAccData }

  if (alloggiati_password) {
    try {
      updatePayload.alloggiati_password_encrypted = encrypt(alloggiati_password)
    } catch (err) {
      console.error('[settings] encryption failed', { entityId, error: err })
      return { success: false, error: 'Errore cifratura credenziali. Verifica ENCRYPTION_KEY.' }
    }
  }

  const { error: accError } = await supabase
    .from('accommodations')
    .update(updatePayload)
    .eq('entity_id', entityId)

  if (accError) {
    console.error('[settings] accommodation update failed', { entityId, error: accError.message })
    return { success: false, error: accError.message }
  }

  revalidatePath('/', 'layout')
  return { success: true }
}
