import type { SupabaseClient } from '@supabase/supabase-js'
import type { ModuleCode, TenantModules, TenantModuleState } from '@touracore/billing'

export interface TenantRow {
  id: string
  name: string
  slug: string
  legal_type: string | null
  country: string | null
  modules: TenantModules
  billing_customer_id: string | null
  created_at: string
  updated_at: string
}

export async function getTenantBySlug(
  supabase: SupabaseClient,
  slug: string
): Promise<TenantRow | null> {
  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()
  if (error) throw error
  return (data as TenantRow) ?? null
}

export async function getTenantById(
  supabase: SupabaseClient,
  id: string
): Promise<TenantRow | null> {
  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return (data as TenantRow) ?? null
}

export function tenantHasModule(tenant: TenantRow, code: ModuleCode): boolean {
  return tenant.modules?.[code]?.active === true
}

export function tenantActiveModules(tenant: TenantRow): ModuleCode[] {
  const modules = tenant.modules ?? {}
  return (Object.keys(modules) as ModuleCode[]).filter((k) => modules[k]?.active)
}

export function countActiveModules(tenant: TenantRow): number {
  return tenantActiveModules(tenant).length
}

export async function updateTenantModuleState(
  supabase: SupabaseClient,
  tenantId: string,
  code: ModuleCode,
  state: TenantModuleState
): Promise<void> {
  const { data, error } = await supabase
    .from('tenants')
    .select('modules')
    .eq('id', tenantId)
    .single()
  if (error) throw error
  const current = (data?.modules ?? {}) as TenantModules
  current[code] = state
  const { error: upErr } = await supabase
    .from('tenants')
    .update({ modules: current })
    .eq('id', tenantId)
  if (upErr) throw upErr
}
