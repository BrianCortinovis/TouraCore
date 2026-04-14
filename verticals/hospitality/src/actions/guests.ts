'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { assertCurrentEntityAccess, requireCurrentEntity } from '../auth/access'
import { createServerSupabaseClient } from '@touracore/db'
import { logAdminAction } from './compliance'

const documentTypeEnum = z.enum(['id_card', 'passport', 'driving_license', 'residence_permit'])
const genderEnum = z.enum(['M', 'F', 'other'])
const loyaltyEnum = z.enum(['bronze', 'silver', 'gold', 'platinum'])

const createGuestSchema = z.object({
  entity_id: z.string().uuid(),
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
  email: z.string().email().max(255).nullish(),
  phone: z.string().max(50).nullish(),
  mobile: z.string().max(50).nullish(),
  date_of_birth: z.string().nullish(),
  gender: genderEnum.nullish(),
  document_type: documentTypeEnum.nullish(),
  document_number: z.string().max(50).nullish(),
  document_issued_by: z.string().max(200).nullish(),
  document_issued_date: z.string().nullish(),
  document_expiry_date: z.string().nullish(),
  document_country: z.string().max(3).nullish(),
  document_scan_url: z.string().url().nullish(),
  address: z.string().max(300).nullish(),
  city: z.string().max(100).nullish(),
  province: z.string().max(5).nullish(),
  zip: z.string().max(10).nullish(),
  country: z.string().max(3).nullish(),
  nationality: z.string().max(100).nullish(),
  citizenship: z.string().max(100).nullish(),
  fiscal_code: z.string().max(16).nullish(),
  birth_place: z.string().max(100).nullish(),
  birth_province: z.string().max(5).nullish(),
  birth_country: z.string().max(3).nullish(),
  company_name: z.string().max(200).nullish(),
  company_vat: z.string().max(20).nullish(),
  company_sdi: z.string().max(7).nullish(),
  company_pec: z.string().email().max(255).nullish(),
  preferences: z.record(z.unknown()).nullish(),
  tags: z.array(z.string().max(50)).max(20).nullish(),
  internal_notes: z.string().max(5000).nullish(),
  privacy_consent: z.boolean().nullish(),
  privacy_consent_date: z.string().nullish(),
  marketing_consent: z.boolean().nullish(),
  marketing_consent_date: z.string().nullish(),
})

const updateGuestSchema = createGuestSchema
  .omit({ entity_id: true })
  .partial()
  .extend({
    loyalty_level: loyaltyEnum.nullish(),
    loyalty_points: z.number().int().min(0).nullish(),
  })

export type CreateGuestData = z.infer<typeof createGuestSchema>
export type UpdateGuestData = z.infer<typeof updateGuestSchema>

interface ActionResult {
  success: boolean
  error?: string
  data?: Record<string, unknown>
}

export async function createGuest(raw: CreateGuestData): Promise<ActionResult> {
  const parsed = createGuestSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Dati non validi' }
  }
  const data = parsed.data

  try {
    const { property } = await assertCurrentEntityAccess(data.entity_id)
    const supabase = await createServerSupabaseClient()

    const { data: guest, error } = await supabase
      .from('guests')
      .insert({
        entity_id: data.entity_id,
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email ?? null,
        phone: data.phone ?? null,
        mobile: data.mobile ?? null,
        date_of_birth: data.date_of_birth ?? null,
        gender: data.gender ?? null,
        document_type: data.document_type ?? null,
        document_number: data.document_number ?? null,
        document_issued_by: data.document_issued_by ?? null,
        document_issued_date: data.document_issued_date ?? null,
        document_expiry_date: data.document_expiry_date ?? null,
        document_country: data.document_country ?? null,
        document_scan_url: data.document_scan_url ?? null,
        address: data.address ?? null,
        city: data.city ?? null,
        province: data.province ?? null,
        zip: data.zip ?? null,
        country: data.country ?? null,
        nationality: data.nationality ?? null,
        citizenship: data.citizenship ?? null,
        fiscal_code: data.fiscal_code ?? null,
        birth_place: data.birth_place ?? null,
        birth_province: data.birth_province ?? null,
        birth_country: data.birth_country ?? null,
        company_name: data.company_name ?? null,
        company_vat: data.company_vat ?? null,
        company_sdi: data.company_sdi ?? null,
        company_pec: data.company_pec ?? null,
        preferences: data.preferences ?? {},
        tags: data.tags ?? [],
        internal_notes: data.internal_notes ?? null,
        total_stays: 0,
        total_nights: 0,
        total_revenue: 0,
        privacy_consent: data.privacy_consent ?? false,
        privacy_consent_date: data.privacy_consent_date ?? null,
        marketing_consent: data.marketing_consent ?? false,
        marketing_consent_date: data.marketing_consent_date ?? null,
        loyalty_points: 0,
      })
      .select()
      .single()

    if (error) return { success: false, error: error.message }

    logAdminAction({
      organizationId: property.tenant_id ?? data.entity_id,
      action: 'guest.create',
      entityType: 'guest',
      entityId: guest.id,
    }).catch(() => {})

    revalidatePath('/guests')
    return { success: true, data: guest as unknown as Record<string, unknown> }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Errore imprevisto' }
  }
}

export async function updateGuest(id: string, raw: UpdateGuestData): Promise<ActionResult> {
  if (!id) return { success: false, error: 'Guest id mancante' }

  const parsed = updateGuestSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Dati non validi' }
  }
  const data = parsed.data

  try {
    const { property } = await requireCurrentEntity()
    const supabase = await createServerSupabaseClient()

    const { data: guest, error } = await supabase
      .from('guests')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('entity_id', property.id)
      .select()
      .single()

    if (error) return { success: false, error: error.message }

    logAdminAction({
      organizationId: property.tenant_id ?? property.id,
      action: 'guest.update',
      entityType: 'guest',
      entityId: id,
    }).catch(() => {})

    revalidatePath('/guests')
    return { success: true, data: guest as unknown as Record<string, unknown> }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Errore imprevisto' }
  }
}

export async function deleteGuest(id: string): Promise<ActionResult> {
  if (!id) return { success: false, error: 'Guest id mancante' }

  try {
    const { property } = await requireCurrentEntity()
    const supabase = await createServerSupabaseClient()

    const { count, error: countError } = await supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('guest_id', id)

    if (countError) return { success: false, error: countError.message }

    if (count && count > 0) {
      return {
        success: false,
        error: `Impossibile eliminare: ${count} prenotazione/i collegate a questo ospite. Rimuoverle prima.`,
      }
    }

    const { error } = await supabase
      .from('guests')
      .delete()
      .eq('id', id)
      .eq('entity_id', property.id)

    if (error) return { success: false, error: error.message }

    logAdminAction({
      organizationId: property.tenant_id ?? property.id,
      action: 'guest.delete',
      entityType: 'guest',
      entityId: id,
    }).catch(() => {})

    revalidatePath('/guests')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Errore imprevisto' }
  }
}
