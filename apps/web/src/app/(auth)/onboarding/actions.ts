'use server'

import { cookies } from 'next/headers'
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

  // Agency attribution: consuma client_invite OR cookie ref_agency
  try {
    const authClient = await createServerSupabaseClient()
    const { data: authRes } = await authClient.auth.getUser()
    const metadata = (authRes.user?.user_metadata ?? {}) as { pending_client_invite?: string | null }
    const pendingInvite = metadata.pending_client_invite

    if (pendingInvite) {
      const { error: rpcErr } = await admin.rpc('agency_client_invitation_accept', {
        p_token: pendingInvite,
        p_user_id: user.id,
        p_tenant_id: tenant.id,
      })
      if (!rpcErr) {
        await authClient.auth.updateUser({ data: { pending_client_invite: null } })
      } else {
        console.warn('[onboarding/step-2] client_invite consume failed:', rpcErr.message)
      }
    } else {
      const cookieStore = await cookies()
      const refAgency = cookieStore.get('ref_agency')?.value
      if (refAgency) {
        const { data: ag } = await admin
          .from('agencies')
          .select('id, is_active, max_tenants')
          .eq('id', refAgency)
          .maybeSingle()
        if (ag && ag.is_active) {
          const { count } = await admin
            .from('agency_tenant_links')
            .select('id', { count: 'exact', head: true })
            .eq('agency_id', ag.id)
            .eq('status', 'active')
          if (!ag.max_tenants || (count ?? 0) < ag.max_tenants) {
            await admin.from('tenants').update({ agency_id: ag.id }).eq('id', tenant.id)
            await admin.from('agency_tenant_links').insert({
              agency_id: ag.id,
              tenant_id: tenant.id,
              billing_mode: 'client_direct',
              default_management_mode: 'self_service',
              status: 'active',
              invited_at: new Date().toISOString(),
              accepted_at: new Date().toISOString(),
            })
          }
        }
        cookieStore.delete('ref_agency')
      }
    }
  } catch (e) {
    console.warn('[onboarding/step-2] agency attribution skipped:', e instanceof Error ? e.message : e)
  }

  return { success: true }
}

// --- Step Modules: selezione moduli e persistenza in tenants.modules ---

const ModuleSelectionSchema = z.object({
  modules: z.array(z.enum([
    'hospitality',
    'restaurant',
    'wellness',
    'experiences',
    'bike_rental',
    'moto_rental',
    'ski_school',
  ])).min(1, 'Seleziona almeno un modulo'),
})

export type ModuleSelectionInput = z.infer<typeof ModuleSelectionSchema>

export async function selectModulesAction(input: ModuleSelectionInput): Promise<ActionResult> {
  const supabase = await createServerSupabaseClient()
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'Sessione scaduta.' }

  const parsed = ModuleSelectionSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Dati non validi' }
  }

  const { data: memberships } = await supabase
    .from('memberships')
    .select('tenant_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .limit(1)

  if (!memberships || memberships.length === 0) {
    return { success: false, error: 'Completa prima la configurazione dell\'attività.' }
  }

  const tenantId = memberships[0]!.tenant_id
  const admin = await createServiceRoleClient()

  // Costruisce modules JSONB: { [code]: { active: false (pending), source: 'onboarding', since: NOW } }
  // active=false finché non conferma il piano a step successivo
  const now = new Date().toISOString()
  const modules: Record<string, { active: boolean; source: string; since: string }> = {}
  for (const code of parsed.data.modules) {
    modules[code] = { active: false, source: 'onboarding_pending', since: now }
  }

  const { error } = await admin
    .from('tenants')
    .update({ modules })
    .eq('id', tenantId)

  if (error) {
    console.error('[onboarding/modules] Errore salvataggio modules:', error)
    return { success: false, error: 'Non siamo riusciti a salvare la selezione.' }
  }

  return { success: true }
}

// --- Step Plan: conferma piano + attivazione moduli (trial o paga subito) ---

const PlanConfirmSchema = z.object({
  mode: z.enum(['trial', 'paid_now']),
  trial_days: z.number().min(0).max(90).optional(),
})

export type PlanConfirmInput = z.infer<typeof PlanConfirmSchema>

export async function confirmPlanAction(input: PlanConfirmInput): Promise<ActionResult & { stripeCheckoutUrl?: string }> {
  const supabase = await createServerSupabaseClient()
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'Sessione scaduta.' }

  const parsed = PlanConfirmSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Dati non validi' }
  }

  const { data: memberships } = await supabase
    .from('memberships')
    .select('tenant_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .limit(1)

  if (!memberships || memberships.length === 0) {
    return { success: false, error: 'Completa prima la configurazione dell\'attività.' }
  }

  const tenantId = memberships[0]!.tenant_id
  const admin = await createServiceRoleClient()

  // Leggi tenant.modules pending
  const { data: tenant } = await admin
    .from('tenants')
    .select('modules')
    .eq('id', tenantId)
    .single()

  const currentModules = (tenant?.modules ?? {}) as Record<string, { active: boolean; source: string; since: string; trial_until?: string }>
  const pendingCodes = Object.keys(currentModules).filter((k) => currentModules[k]?.source === 'onboarding_pending')

  if (pendingCodes.length === 0) {
    return { success: false, error: 'Nessun modulo da attivare. Seleziona prima i moduli.' }
  }

  const now = new Date()
  const trialDays = parsed.data.trial_days ?? 14
  const trialUntil = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000).toISOString()

  // Attiva moduli in trial (attivi immediatamente, charge a scadenza trial via Stripe)
  const updatedModules: Record<string, { active: boolean; source: string; since: string; trial_until?: string }> = { ...currentModules }
  for (const code of pendingCodes) {
    updatedModules[code] = {
      active: true,
      source: parsed.data.mode === 'trial' ? 'trial' : 'subscription',
      since: now.toISOString(),
      ...(parsed.data.mode === 'trial' ? { trial_until: trialUntil } : {}),
    }
  }

  const { error: upErr } = await admin
    .from('tenants')
    .update({ modules: updatedModules })
    .eq('id', tenantId)

  if (upErr) {
    console.error('[onboarding/plan] Errore attivazione moduli:', upErr)
    return { success: false, error: 'Non siamo riusciti ad attivare i moduli.' }
  }

  // Log activation
  for (const code of pendingCodes) {
    await admin.from('module_activation_log').insert({
      tenant_id: tenantId,
      module_code: code,
      action: parsed.data.mode === 'trial' ? 'trial_started' : 'activated',
      actor_user_id: user.id,
      actor_scope: 'tenant_owner',
      notes: `Onboarding: mode=${parsed.data.mode}, trial_days=${trialDays}`,
    })
  }

  // TODO: creare Stripe SetupIntent o Checkout Session qui e restituire URL
  // Per ora onboarding attiva direttamente trial senza carta (MVP); Stripe integration F9.
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
