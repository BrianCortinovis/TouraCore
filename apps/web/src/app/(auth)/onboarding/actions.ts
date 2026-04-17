'use server'

import { z } from 'zod'
import { createServerSupabaseClient, createServiceRoleClient } from '@touracore/db/server'
import { getCurrentUser } from '@touracore/auth'

// --- Step 2: Crea tenant con dati legali ---

const Step2Schema = z.object({
  name: z.string().min(2, 'Il nome deve avere almeno 2 caratteri').max(100).trim(),
  slug: z.string().min(3, "L'indirizzo deve avere almeno 3 caratteri").max(60)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "L'indirizzo può contenere solo lettere minuscole, numeri e trattini"),
  country: z.enum(['IT', 'CH', 'FR', 'AT', 'DE']),
  legal_type: z.enum(['private', 'business']),
  legal_name: z.string().nullable(),
  legal_details: z.record(z.string(), z.unknown()),
  billing_address_line1: z.string().nullable(),
  billing_city: z.string().nullable(),
  billing_state: z.string().nullable(),
  billing_postal_code: z.string().nullable(),
})

export type Step2Input = z.infer<typeof Step2Schema>

interface ActionResult {
  success: boolean
  error?: string
  fieldErrors?: Record<string, string>
}

export async function createTenantWithLegalAction(input: Step2Input): Promise<ActionResult> {
  const supabase = await createServerSupabaseClient()
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'Sessione scaduta. Effettua nuovamente il login.' }

  const parsed = Step2Schema.safeParse(input)
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {}
    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0] ?? 'unknown')
      if (!fieldErrors[field]) fieldErrors[field] = issue.message
    }
    return { success: false, fieldErrors }
  }

  // Verifica che l'utente non abbia già un tenant attivo
  const { data: existingMemberships } = await supabase
    .from('memberships')
    .select('tenant_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .limit(1)

  if (existingMemberships && existingMemberships.length > 0) {
    // Ha già un tenant: aggiorna i dati legali
    const tenantId = existingMemberships[0]!.tenant_id
    const admin = await createServiceRoleClient()
    const { error } = await admin
      .from('tenants')
      .update({
        name: parsed.data.name,
        slug: parsed.data.slug,
        country: parsed.data.country,
        legal_type: parsed.data.legal_type,
        legal_name: parsed.data.legal_name,
        legal_details: parsed.data.legal_details,
        billing_address_line1: parsed.data.billing_address_line1,
        billing_city: parsed.data.billing_city,
        billing_state: parsed.data.billing_state,
        billing_postal_code: parsed.data.billing_postal_code,
        billing_country: parsed.data.country,
      })
      .eq('id', tenantId)

    if (error) {
      console.error('[onboarding/step-2] Errore aggiornamento tenant:', error)
      return { success: false, error: 'Non siamo riusciti a salvare i dati. Riprova.' }
    }
    return { success: true }
  }

  // Crea nuovo tenant
  const admin = await createServiceRoleClient()

  // Verifica unicità slug
  const { data: slugExists } = await admin
    .from('tenants')
    .select('id')
    .eq('slug', parsed.data.slug)
    .limit(1)

  if (slugExists && slugExists.length > 0) {
    return { success: false, fieldErrors: { slug: 'Questo indirizzo è già utilizzato.' } }
  }

  const { data: tenant, error: tenantError } = await admin
    .from('tenants')
    .insert({
      name: parsed.data.name,
      slug: parsed.data.slug,
      country: parsed.data.country,
      legal_type: parsed.data.legal_type,
      legal_name: parsed.data.legal_name,
      legal_details: parsed.data.legal_details,
      billing_address_line1: parsed.data.billing_address_line1,
      billing_city: parsed.data.billing_city,
      billing_state: parsed.data.billing_state,
      billing_postal_code: parsed.data.billing_postal_code,
      billing_country: parsed.data.country,
    })
    .select('id')
    .single()

  if (tenantError || !tenant) {
    console.error('[onboarding/step-2] Errore creazione tenant:', tenantError)
    return { success: false, error: 'Non siamo riusciti a creare la tua attività. Riprova.' }
  }

  // Crea membership owner
  const { error: membershipError } = await admin
    .from('memberships')
    .insert({
      tenant_id: tenant.id,
      user_id: user.id,
      role: 'owner',
      is_active: true,
    })

  if (membershipError) {
    console.error('[onboarding/step-2] Errore creazione membership:', membershipError)
    await admin.from('tenants').delete().eq('id', tenant.id)
    return { success: false, error: 'Non siamo riusciti a completare la configurazione. Riprova.' }
  }

  // Attiva modulo hospitality
  const { error: moduleError } = await admin
    .from('module_activations')
    .insert({
      tenant_id: tenant.id,
      module: 'hospitality',
      is_active: true,
    })

  if (moduleError) {
    console.error('[onboarding/step-2] Errore attivazione modulo hospitality:', moduleError)
  }

  return { success: true }
}

// --- Step 3: Crea prima property (opzionale) ---

const Step3Schema = z.object({
  name: z.string().min(2, 'Il nome deve avere almeno 2 caratteri').max(100).trim(),
  type: z.enum(['hotel', 'residence', 'mixed', 'b_and_b', 'agriturismo', 'casa_vacanze', 'affittacamere']),
  country: z.enum(['IT', 'CH', 'FR', 'AT', 'DE']).optional(),
  address: z.string().optional().or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
  province: z.string().optional().or(z.literal('')),
  zip: z.string().optional().or(z.literal('')),
  short_description: z.string().max(200).optional().or(z.literal('')),
  is_imprenditoriale: z.boolean().optional(),
})

export type Step3Input = z.infer<typeof Step3Schema>

export async function createFirstPropertyAction(input: Step3Input): Promise<ActionResult & { entityId?: string; entitySlug?: string; tenantSlug?: string | null }> {
  const supabase = await createServerSupabaseClient()
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'Sessione scaduta.' }

  const parsed = Step3Schema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Dati non validi' }
  }

  // Trova il tenant dell'utente
  const { data: memberships } = await supabase
    .from('memberships')
    .select('tenant_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .limit(1)

  if (!memberships || memberships.length === 0) {
    return { success: false, error: 'Completa prima la configurazione della tua attività.' }
  }

  const tenantId = memberships[0]!.tenant_id

  const admin = await createServiceRoleClient()

  // Legge il country del tenant come default
  const { data: tenantData } = await admin
    .from('tenants')
    .select('country')
    .eq('id', tenantId)
    .single()

  const propertyCountry = parsed.data.country ?? (tenantData?.country as string) ?? 'IT'

  // Genera slug dal nome
  const baseSlug = parsed.data.name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'struttura'

  // 1. INSERT tabella base entities (campi comuni)
  const { data: entity, error: entityError } = await admin
    .from('entities')
    .insert({
      tenant_id: tenantId,
      kind: 'accommodation',
      slug: baseSlug,
      name: parsed.data.name,
      short_description: parsed.data.short_description || null,
      country_override: propertyCountry !== (tenantData?.country as string) ? propertyCountry : null,
      management_mode: 'self_service',
      is_active: true,
    })
    .select('id, slug')
    .single()

  if (entityError || !entity) {
    console.error('[onboarding/step-3] Errore creazione entity:', entityError)
    return {
      success: false,
      error: `Non siamo riusciti a creare la struttura: ${entityError?.message ?? 'errore sconosciuto'}`,
    }
  }

  // 2. INSERT tabella subtype accommodations (campi hospitality-specifici)
  const { error: accError } = await admin
    .from('accommodations')
    .insert({
      entity_id: entity.id,
      property_type: parsed.data.type,
      is_imprenditoriale: parsed.data.is_imprenditoriale ?? true,
      country: propertyCountry,
      address: parsed.data.address || null,
      city: parsed.data.city || null,
      province: parsed.data.province || null,
      zip: parsed.data.zip || null,
      default_check_in_time: '14:00',
      default_check_out_time: '10:00',
    })

  if (accError) {
    // Rollback: elimino l'entity orfana
    await admin.from('entities').delete().eq('id', entity.id)
    console.error('[onboarding/step-3] Errore creazione accommodation:', accError)
    return {
      success: false,
      error: `Non siamo riusciti a creare la struttura: ${accError.message}`,
    }
  }

  // 3. Crea staff_members per il creatore
  await admin
    .from('staff_members')
    .insert({
      entity_id: entity.id,
      user_id: user.id,
      role: 'owner',
      is_active: true,
    })

  const { data: tenantForSlug } = await admin
    .from('tenants')
    .select('slug')
    .eq('id', tenantId)
    .single()

  return { success: true, entityId: entity.id, entitySlug: entity.slug, tenantSlug: tenantForSlug?.slug }
}

// --- Backward-compatible exports ---

export type OnboardingInput = { name: string; slug: string }

export async function createTenantAction(input: OnboardingInput): Promise<ActionResult> {
  return createTenantWithLegalAction({
    ...input,
    country: 'IT',
    legal_type: 'private',
    legal_name: null,
    legal_details: {},
    billing_address_line1: null,
    billing_city: null,
    billing_state: null,
    billing_postal_code: null,
  })
}

export async function checkSlugAvailability(slug: string): Promise<boolean> {
  if (!slug || slug.length < 3) return false
  const admin = await createServiceRoleClient()
  const { data } = await admin
    .from('tenants')
    .select('id')
    .eq('slug', slug)
    .limit(1)
  return !data || data.length === 0
}
