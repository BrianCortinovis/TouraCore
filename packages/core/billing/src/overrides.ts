import type { SupabaseClient } from '@supabase/supabase-js'
import type { ModuleCode, ModuleOverride, OverrideType } from './types'

export async function listActiveOverrides(
  supabase: SupabaseClient,
  tenantId: string
): Promise<ModuleOverride[]> {
  const { data, error } = await supabase
    .from('module_overrides')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('active', true)
  if (error) throw error
  return (data ?? []) as ModuleOverride[]
}

export async function getFreeOverride(
  supabase: SupabaseClient,
  tenantId: string,
  moduleCode: ModuleCode
): Promise<ModuleOverride | null> {
  const { data, error } = await supabase
    .from('module_overrides')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('module_code', moduleCode)
    .eq('override_type', 'free')
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  const row = data as ModuleOverride | null
  if (!row) return null
  if (row.valid_until && new Date(row.valid_until) <= new Date()) return null
  return row
}

export async function grantOverride(
  supabase: SupabaseClient,
  params: {
    tenant_id: string
    module_code: ModuleCode
    override_type: OverrideType
    override_value?: number
    reason: string
    granted_by_user_id: string
    granted_by_scope: 'super_admin' | 'agency'
    granted_by_agency_id?: string
    valid_until?: string | null
  }
): Promise<ModuleOverride> {
  const { data, error } = await supabase
    .from('module_overrides')
    .insert({
      tenant_id: params.tenant_id,
      module_code: params.module_code,
      override_type: params.override_type,
      override_value: params.override_value ?? null,
      reason: params.reason,
      granted_by_user_id: params.granted_by_user_id,
      granted_by_scope: params.granted_by_scope,
      granted_by_agency_id: params.granted_by_agency_id ?? null,
      valid_until: params.valid_until ?? null,
      active: true,
    })
    .select()
    .single()
  if (error) throw error
  return data as ModuleOverride
}

export async function revokeOverride(
  supabase: SupabaseClient,
  id: string,
  revokedByUserId: string,
  reason: string
): Promise<void> {
  const { error } = await supabase
    .from('module_overrides')
    .update({
      active: false,
      revoked_at: new Date().toISOString(),
      revoked_by_user_id: revokedByUserId,
      revoked_reason: reason,
    })
    .eq('id', id)
  if (error) throw error
}

export async function agencyFreeGrantsRemaining(
  supabase: SupabaseClient,
  agencyId: string
): Promise<number | null> {
  const { data, error } = await supabase.rpc('agency_can_grant_free_remaining', {
    p_agency: agencyId,
  })
  if (error) throw error
  return data as number | null
}
