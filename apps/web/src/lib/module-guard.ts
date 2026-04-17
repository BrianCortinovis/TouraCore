import { redirect } from 'next/navigation'
import type { SupabaseClient } from '@supabase/supabase-js'

export type ModuleCode =
  | 'hospitality'
  | 'restaurant'
  | 'wellness'
  | 'experiences'
  | 'bike_rental'
  | 'moto_rental'
  | 'ski_school'

export const VERTICAL_TO_MODULE: Record<string, ModuleCode> = {
  stays: 'hospitality',
  dine: 'restaurant',
  wellness: 'wellness',
  experiences: 'experiences',
  activities: 'experiences',
  bike: 'bike_rental',
  moto: 'moto_rental',
  ski: 'ski_school',
}

export const MODULE_TO_VERTICAL: Record<ModuleCode, string> = {
  hospitality: 'stays',
  restaurant: 'dine',
  wellness: 'wellness',
  experiences: 'experiences',
  bike_rental: 'bike',
  moto_rental: 'moto',
  ski_school: 'ski',
}

/**
 * Verifica che il modulo sia attivo sul tenant. Considera:
 * 1. tenants.modules[code].active === true
 * 2. Free override attivo (bypass)
 *
 * Se non valido, redirect a /settings/modules con query di attivazione.
 */
export async function assertTenantModuleActive(params: {
  supabase: SupabaseClient
  tenantId: string
  tenantSlug: string
  moduleCode: ModuleCode
}): Promise<void> {
  const { supabase, tenantId, tenantSlug, moduleCode } = params

  const { data: tenant } = await supabase
    .from('tenants')
    .select('modules')
    .eq('id', tenantId)
    .single()

  const modules = (tenant?.modules ?? {}) as Record<string, { active?: boolean }>
  if (modules[moduleCode]?.active === true) return

  // Fallback: check free override
  const { data: freeActive } = await supabase.rpc('has_active_free_override', {
    p_tenant: tenantId,
    p_module: moduleCode,
  })
  if (freeActive === true) return

  redirect(`/${tenantSlug}/settings/modules?activate=${moduleCode}`)
}
