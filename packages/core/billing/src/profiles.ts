import type { SupabaseClient } from '@supabase/supabase-js'
import type { BillingProfile, ModuleCode } from './types'

export async function resolveBillingProfile(
  supabase: SupabaseClient,
  tenantId: string,
  moduleCode: ModuleCode
): Promise<BillingProfile | null> {
  const { data, error } = await supabase.rpc('resolve_billing_profile', {
    p_tenant: tenantId,
    p_module: moduleCode,
  })
  if (error) throw error
  const rows = data as BillingProfile[] | null
  if (!rows || rows.length === 0) return null
  return rows[0] ?? null
}

export async function getEffectiveModulePrice(
  supabase: SupabaseClient,
  tenantId: string,
  moduleCode: ModuleCode
): Promise<number> {
  const { data, error } = await supabase.rpc('get_effective_module_price', {
    p_tenant: tenantId,
    p_module: moduleCode,
  })
  if (error) throw error
  return Number(data ?? 0)
}

export async function hasActiveFreeOverride(
  supabase: SupabaseClient,
  tenantId: string,
  moduleCode: ModuleCode
): Promise<boolean> {
  const { data, error } = await supabase.rpc('has_active_free_override', {
    p_tenant: tenantId,
    p_module: moduleCode,
  })
  if (error) throw error
  return Boolean(data)
}

export async function createBillingProfile(
  supabase: SupabaseClient,
  profile: Omit<BillingProfile, 'id' | 'created_at' | 'updated_at'>
): Promise<BillingProfile> {
  const { data, error } = await supabase
    .from('billing_profiles')
    .insert(profile)
    .select()
    .single()
  if (error) throw error
  return data as BillingProfile
}

export async function listBillingProfilesByScope(
  supabase: SupabaseClient,
  scope: 'tenant' | 'agency' | 'global_default',
  scopeId?: string
): Promise<BillingProfile[]> {
  let q = supabase
    .from('billing_profiles')
    .select('*')
    .eq('scope', scope)
    .eq('active', true)
  if (scopeId) q = q.eq('scope_id', scopeId)
  const { data, error } = await q.order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as BillingProfile[]
}

export function calculateCommission(params: {
  profile: BillingProfile
  baseAmount: number
  appliesTo: 'booking_total' | 'booking_net' | 'coperto' | 'rental' | 'upsell'
}): {
  total: number
  platform: number
  agency: number
} {
  const { profile, baseAmount } = params
  if (!profile.commission_applies_to.includes(params.appliesTo)) {
    return { total: 0, platform: 0, agency: 0 }
  }
  const pct = profile.commission_percent ?? 0
  const fixed = profile.commission_fixed_eur ?? 0
  let total = +(baseAmount * (pct / 100) + fixed).toFixed(2)
  if (profile.commission_min_eur != null) total = Math.max(total, profile.commission_min_eur)
  if (profile.commission_cap_eur != null) total = Math.min(total, profile.commission_cap_eur)

  let platform = total
  let agency = 0
  if (profile.platform_commission_percent != null && profile.agency_commission_percent != null) {
    platform = +(baseAmount * (profile.platform_commission_percent / 100)).toFixed(2)
    agency = +(baseAmount * (profile.agency_commission_percent / 100)).toFixed(2)
    total = +(platform + agency).toFixed(2)
  }
  return { total, platform, agency }
}
