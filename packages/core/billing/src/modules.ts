import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  ModuleCatalogEntry,
  ModuleCode,
  SubscriptionItem,
  TenantModules,
  TenantModuleState,
} from './types'

export async function listCatalog(supabase: SupabaseClient): Promise<ModuleCatalogEntry[]> {
  const { data, error } = await supabase
    .from('module_catalog')
    .select('*')
    .eq('active', true)
    .order('order_idx', { ascending: true })
  if (error) throw error
  return (data ?? []) as ModuleCatalogEntry[]
}

export async function getCatalogEntry(
  supabase: SupabaseClient,
  code: ModuleCode
): Promise<ModuleCatalogEntry | null> {
  const { data, error } = await supabase
    .from('module_catalog')
    .select('*')
    .eq('code', code)
    .maybeSingle()
  if (error) throw error
  return (data as ModuleCatalogEntry) ?? null
}

export async function getTenantModules(
  supabase: SupabaseClient,
  tenantId: string
): Promise<TenantModules> {
  const { data, error } = await supabase
    .from('tenants')
    .select('modules')
    .eq('id', tenantId)
    .single()
  if (error) throw error
  return (data?.modules ?? {}) as TenantModules
}

export function hasModule(modules: TenantModules, code: ModuleCode): boolean {
  return modules[code]?.active === true
}

export function listActiveModules(modules: TenantModules): ModuleCode[] {
  return (Object.keys(modules) as ModuleCode[]).filter((k) => modules[k]?.active)
}

export async function getSubscriptionItems(
  supabase: SupabaseClient,
  tenantId: string
): Promise<SubscriptionItem[]> {
  const { data, error } = await supabase
    .from('subscription_items')
    .select('*')
    .eq('tenant_id', tenantId)
  if (error) throw error
  return (data ?? []) as SubscriptionItem[]
}

export async function setTenantModuleState(
  supabase: SupabaseClient,
  tenantId: string,
  code: ModuleCode,
  state: TenantModuleState
): Promise<void> {
  // read-modify-write su JSONB (atomic via SQL jsonb_set)
  const { error } = await supabase.rpc('jsonb_set_module_state', {
    p_tenant: tenantId,
    p_module: code,
    p_state: state as unknown as Record<string, unknown>,
  })
  if (error) {
    // Fallback: fetch → merge → update
    const modules = await getTenantModules(supabase, tenantId)
    modules[code] = state
    const { error: upErr } = await supabase
      .from('tenants')
      .update({ modules })
      .eq('id', tenantId)
    if (upErr) throw upErr
  }
}

export async function logModuleAction(
  supabase: SupabaseClient,
  params: {
    tenant_id: string
    module_code: ModuleCode
    action:
      | 'activated'
      | 'deactivated'
      | 'paused'
      | 'resumed'
      | 'trial_started'
      | 'trial_ended'
      | 'payment_failed'
      | 'free_granted'
      | 'free_revoked'
      | 'override_applied'
      | 'override_removed'
      | 'billing_profile_changed'
    actor_user_id?: string | null
    actor_scope?: 'super_admin' | 'agency' | 'tenant_owner' | 'system'
    actor_agency_id?: string | null
    stripe_event_id?: string | null
    payload?: Record<string, unknown>
    notes?: string | null
  }
): Promise<void> {
  const { error } = await supabase.from('module_activation_log').insert({
    tenant_id: params.tenant_id,
    module_code: params.module_code,
    action: params.action,
    actor_user_id: params.actor_user_id ?? null,
    actor_scope: params.actor_scope ?? 'system',
    actor_agency_id: params.actor_agency_id ?? null,
    stripe_event_id: params.stripe_event_id ?? null,
    payload: params.payload ?? {},
    notes: params.notes ?? null,
  })
  if (error) throw error
}

export async function activateModule(
  supabase: SupabaseClient,
  tenantId: string,
  code: ModuleCode,
  opts: {
    source?: 'subscription' | 'override_free' | 'trial'
    trialUntil?: string
    actorUserId?: string
    actorScope?: 'super_admin' | 'agency' | 'tenant_owner' | 'system'
  } = {}
): Promise<void> {
  const state: TenantModuleState = {
    active: true,
    source: opts.source ?? 'subscription',
    since: new Date().toISOString(),
    ...(opts.trialUntil ? { trial_until: opts.trialUntil } : {}),
  }
  await setTenantModuleState(supabase, tenantId, code, state)
  await logModuleAction(supabase, {
    tenant_id: tenantId,
    module_code: code,
    action: opts.source === 'trial' ? 'trial_started' : 'activated',
    actor_user_id: opts.actorUserId,
    actor_scope: opts.actorScope ?? 'system',
  })
}

export async function deactivateModule(
  supabase: SupabaseClient,
  tenantId: string,
  code: ModuleCode,
  opts: { actorUserId?: string; actorScope?: 'super_admin' | 'agency' | 'tenant_owner' | 'system'; reason?: string } = {}
): Promise<void> {
  const state: TenantModuleState = {
    active: false,
    source: 'subscription',
  }
  await setTenantModuleState(supabase, tenantId, code, state)
  await logModuleAction(supabase, {
    tenant_id: tenantId,
    module_code: code,
    action: 'deactivated',
    actor_user_id: opts.actorUserId,
    actor_scope: opts.actorScope ?? 'system',
    notes: opts.reason,
  })
}
