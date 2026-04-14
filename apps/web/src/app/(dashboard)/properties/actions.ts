'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@touracore/db/server'
import { logAudit, getAuditContext } from '@touracore/audit'
import { getAuthBootstrapData } from '@touracore/auth/bootstrap'
import type { PropertyType } from '@touracore/hospitality/src/types/database'

interface ActionResult {
  success: boolean
  error?: string
  data?: unknown
}

export interface PropertyFormData {
  name: string
  type: PropertyType
  short_description?: string
  description?: string
  slug?: string
  is_active?: boolean
  address?: string
  city?: string
  province?: string
  region?: string
  zip?: string
  country?: string
  latitude?: number | null
  longitude?: number | null
  email?: string
  phone?: string
  website?: string
  default_check_in_time?: string
  default_check_out_time?: string
  amenities?: string[]
}

// --- Lista strutture del tenant ---

export async function listPropertiesAction(): Promise<ActionResult> {
  const supabase = await createServerSupabaseClient()
  const bootstrap = await getAuthBootstrapData()
  if (!bootstrap.tenant) {
    console.warn('[listPropertiesAction] TENANT_REQUIRED')
    throw new Error('TENANT_REQUIRED')
  }

  const { data, error } = await supabase
    .from('entities')
    .select('id, name, is_active, short_description, kind, accommodations(property_type, city, province, address, logo_url)')
    .eq('tenant_id', bootstrap.tenant.id)
    .eq('kind', 'accommodation')
    .order('name')

  if (error) return { success: false, error: error.message }

  // Appiattisco il join per compatibilità con il consumer legacy
  const flattened = (data ?? []).map((row: Record<string, unknown>) => {
    const acc = (row.accommodations as Record<string, unknown> | null) ?? {}
    return {
      id: row.id,
      name: row.name,
      is_active: row.is_active,
      short_description: row.short_description,
      type: acc.property_type ?? null,
      city: acc.city ?? null,
      province: acc.province ?? null,
      address: acc.address ?? null,
      logo_url: acc.logo_url ?? null,
    }
  })

  return { success: true, data: flattened }
}

// --- Dettaglio struttura ---

export async function getPropertyAction(entityId?: string): Promise<ActionResult> {
  const supabase = await createServerSupabaseClient()
  const bootstrap = await getAuthBootstrapData()
  if (!bootstrap.tenant) throw new Error('TENANT_REQUIRED')

  const targetId = entityId ?? bootstrap.property?.id
  if (!targetId) return { success: true, data: null }

  const { data, error } = await supabase
    .from('entities')
    .select('*, accommodations(*)')
    .eq('id', targetId)
    .eq('tenant_id', bootstrap.tenant.id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return { success: true, data: null }
    return { success: false, error: error.message }
  }

  // Appiattisco il join: merge accommodations fields nell'oggetto top-level
  const acc = (data?.accommodations as Record<string, unknown> | null) ?? {}
  const flattened = {
    ...data,
    ...acc,
    type: acc.property_type ?? null,
    accommodations: undefined,
  }

  return { success: true, data: flattened }
}

// --- Creazione struttura ---

export async function createPropertyAction(input: PropertyFormData): Promise<ActionResult> {
  if (!input.name?.trim()) {
    return { success: false, error: 'Il nome della struttura è obbligatorio.' }
  }

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Sessione scaduta.' }

  const bootstrap = await getAuthBootstrapData()
  if (!bootstrap.tenant) return { success: false, error: 'Nessuna attività attiva.' }

  const tenantId = bootstrap.tenant.id

  if (input.slug) {
    const { data: existing } = await supabase
      .from('entities')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('slug', input.slug)
      .maybeSingle()

    if (existing) {
      return { success: false, error: 'Questo indirizzo è già utilizzato per un\'altra struttura.' }
    }
  }

  // 1. INSERT nella tabella base entities (campi comuni a tutti i kind)
  const { data: property, error } = await supabase
    .from('entities')
    .insert({
      tenant_id: tenantId,
      kind: 'accommodation',
      name: input.name.trim(),
      short_description: input.short_description || null,
      description: input.description || null,
      slug: input.slug || null,
      is_active: input.is_active ?? true,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[createPropertyAction] INSERT entities failed:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    })
    return { success: false, error: `Creazione non riuscita: ${error.message}` }
  }

  // 2. INSERT nella tabella subtype accommodations (campi hospitality-specifici)
  const { error: accError } = await supabase
    .from('accommodations')
    .insert({
      entity_id: property.id,
      property_type: input.type,
      address: input.address || null,
      city: input.city || null,
      province: input.province || null,
      region: input.region || null,
      zip: input.zip || null,
      country: input.country || 'IT',
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      email: input.email || null,
      phone: input.phone || null,
      website: input.website || null,
      default_check_in_time: input.default_check_in_time || '14:00',
      default_check_out_time: input.default_check_out_time || '10:00',
      amenities: input.amenities ?? [],
    })

  if (accError) {
    // Rollback manuale: elimino l'entity appena creata per non lasciare orfani
    await supabase.from('entities').delete().eq('id', property.id)
    console.error('[createPropertyAction] INSERT accommodations failed:', {
      code: accError.code,
      message: accError.message,
      details: accError.details,
      hint: accError.hint,
    })
    return { success: false, error: `Creazione non riuscita: ${accError.message}` }
  }

  // Crea membership staff per il creatore (non-blocking: se fallisce loggiamo ma la property resta)
  const { error: staffError } = await supabase
    .from('staff_members')
    .insert({
      entity_id: property.id,
      user_id: user.id,
      role: 'owner',
      first_name: bootstrap.profile?.display_name?.split(' ')[0] ?? '',
      last_name: bootstrap.profile?.display_name?.split(' ').slice(1).join(' ') ?? '',
      email: user.email,
      is_active: true,
    })

  if (staffError) {
    console.error('[createPropertyAction] INSERT staff_members failed (non-blocking):', {
      code: staffError.code,
      message: staffError.message,
      details: staffError.details,
      hint: staffError.hint,
    })
  }

  const auditCtx = await getAuditContext(tenantId, user.id)
  await logAudit({
    context: auditCtx,
    action: 'property.create',
    entityType: 'property',
    entityId: property.id,
    newData: { name: input.name, type: input.type },
  })

  revalidatePath('/properties')
  return { success: true, data: { id: property.id } }
}

// --- Aggiornamento struttura ---

export async function updatePropertyAction(
  entityId: string,
  input: PropertyFormData
): Promise<ActionResult> {
  if (!input.name?.trim()) {
    return { success: false, error: 'Il nome della struttura è obbligatorio.' }
  }

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Sessione scaduta.' }

  const bootstrap = await getAuthBootstrapData()
  if (!bootstrap.tenant) return { success: false, error: 'Nessuna attività attiva.' }

  if (input.slug) {
    const { data: existing } = await supabase
      .from('entities')
      .select('id')
      .eq('tenant_id', bootstrap.tenant.id)
      .eq('slug', input.slug)
      .neq('id', entityId)
      .maybeSingle()

    if (existing) {
      return { success: false, error: 'Questo indirizzo è già utilizzato per un\'altra struttura.' }
    }
  }

  // 1. UPDATE entities (campi base)
  const { error } = await supabase
    .from('entities')
    .update({
      name: input.name.trim(),
      short_description: input.short_description || null,
      description: input.description || null,
      slug: input.slug || null,
      is_active: input.is_active ?? true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', entityId)
    .eq('tenant_id', bootstrap.tenant.id)

  if (error) {
    return { success: false, error: 'Non siamo riusciti a salvare le modifiche. Riprova tra un momento.' }
  }

  // 2. UPDATE accommodations (campi hospitality-specifici)
  const { error: accError } = await supabase
    .from('accommodations')
    .update({
      property_type: input.type,
      address: input.address || null,
      city: input.city || null,
      province: input.province || null,
      region: input.region || null,
      zip: input.zip || null,
      country: input.country || 'IT',
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      email: input.email || null,
      phone: input.phone || null,
      website: input.website || null,
      default_check_in_time: input.default_check_in_time || '14:00',
      default_check_out_time: input.default_check_out_time || '10:00',
      amenities: input.amenities ?? [],
    })
    .eq('entity_id', entityId)

  if (accError) {
    console.error('[updatePropertyAction] UPDATE accommodations failed:', accError)
    return { success: false, error: 'Non siamo riusciti a salvare le modifiche. Riprova tra un momento.' }
  }

  const auditCtx = await getAuditContext(bootstrap.tenant.id, user.id)
  await logAudit({
    context: auditCtx,
    action: 'property.update',
    entityType: 'property',
    entityId: entityId,
    newData: { name: input.name, type: input.type },
  })

  revalidatePath('/properties')
  revalidatePath(`/properties/${entityId}`)
  return { success: true }
}

// --- Eliminazione struttura ---

export async function deletePropertyAction(entityId: string): Promise<ActionResult> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Sessione scaduta.' }

  const bootstrap = await getAuthBootstrapData()
  if (!bootstrap.tenant) return { success: false, error: 'Nessuna attività attiva.' }

  const { error } = await supabase
    .from('entities')
    .delete()
    .eq('id', entityId)
    .eq('tenant_id', bootstrap.tenant.id)

  if (error) {
    return { success: false, error: 'Non siamo riusciti a eliminare la struttura. Potrebbe avere dati collegati.' }
  }

  const auditCtx = await getAuditContext(bootstrap.tenant.id, user.id)
  await logAudit({
    context: auditCtx,
    action: 'property.delete',
    entityType: 'property',
    entityId: entityId,
  })

  revalidatePath('/properties')
  return { success: true }
}
