import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  TenantSetting,
  ModuleActivation,
  ModuleSetting,
  EntitySetting,
  ConfigEntry,
} from './types';

// --- Platform Settings (service_role only) ---

export async function getPlatformSetting(
  supabase: SupabaseClient,
  key: string
): Promise<unknown | null> {
  const { data, error } = await supabase
    .from('platform_settings')
    .select('value')
    .eq('key', key)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Errore lettura platform setting: ${error.message}`);
  }
  return (data as { value: unknown }).value;
}

export async function setPlatformSetting(
  supabase: SupabaseClient,
  key: string,
  value: unknown
): Promise<void> {
  const { error } = await supabase
    .from('platform_settings')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });

  if (error) throw new Error(`Errore scrittura platform setting: ${error.message}`);
}

export async function listPlatformSettings(
  supabase: SupabaseClient
): Promise<Array<{ key: string; value: unknown; updated_at: string }>> {
  const { data, error } = await supabase
    .from('platform_settings')
    .select('key, value, updated_at')
    .order('key');

  if (error) throw new Error(`Errore lettura platform settings: ${error.message}`);
  return (data ?? []) as Array<{ key: string; value: unknown; updated_at: string }>;
}

// --- Tenant Settings ---

export async function getTenantSetting(
  supabase: SupabaseClient,
  tenantId: string,
  key: string
): Promise<unknown | null> {
  const { data, error } = await supabase
    .from('tenant_settings')
    .select('value')
    .eq('tenant_id', tenantId)
    .eq('key', key)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Errore lettura tenant setting: ${error.message}`);
  }
  return (data as { value: unknown }).value;
}

export async function setTenantSetting(
  supabase: SupabaseClient,
  tenantId: string,
  key: string,
  value: unknown
): Promise<void> {
  const { error } = await supabase
    .from('tenant_settings')
    .upsert(
      { tenant_id: tenantId, key, value, updated_at: new Date().toISOString() },
      { onConflict: 'tenant_id,key' }
    );

  if (error) throw new Error(`Errore scrittura tenant setting: ${error.message}`);
}

export async function listTenantSettings(
  supabase: SupabaseClient,
  tenantId: string
): Promise<TenantSetting[]> {
  const { data, error } = await supabase
    .from('tenant_settings')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('key');

  if (error) throw new Error(`Errore lettura tenant settings: ${error.message}`);
  return (data ?? []) as TenantSetting[];
}

export async function deleteTenantSetting(
  supabase: SupabaseClient,
  tenantId: string,
  key: string
): Promise<void> {
  const { error } = await supabase
    .from('tenant_settings')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('key', key);

  if (error) throw new Error(`Errore eliminazione tenant setting: ${error.message}`);
}

// --- Module Activations ---

export async function listModuleActivations(
  supabase: SupabaseClient,
  tenantId: string
): Promise<ModuleActivation[]> {
  const { data, error } = await supabase
    .from('module_activations')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('module');

  if (error) throw new Error(`Errore lettura moduli: ${error.message}`);
  return (data ?? []) as ModuleActivation[];
}

export async function toggleModule(
  supabase: SupabaseClient,
  tenantId: string,
  module: string,
  isActive: boolean
): Promise<void> {
  const { error } = await supabase
    .from('module_activations')
    .upsert(
      {
        tenant_id: tenantId,
        module,
        is_active: isActive,
        activated_at: new Date().toISOString(),
      },
      { onConflict: 'tenant_id,module' }
    );

  if (error) throw new Error(`Errore toggle modulo: ${error.message}`);
}

// --- Module Settings ---

export async function getModuleSetting(
  supabase: SupabaseClient,
  tenantId: string,
  module: string,
  key: string
): Promise<unknown | null> {
  const { data, error } = await supabase
    .from('module_settings')
    .select('value')
    .eq('tenant_id', tenantId)
    .eq('module', module)
    .eq('key', key)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Errore lettura module setting: ${error.message}`);
  }
  return (data as { value: unknown }).value;
}

export async function setModuleSetting(
  supabase: SupabaseClient,
  tenantId: string,
  module: string,
  key: string,
  value: unknown
): Promise<void> {
  const { error } = await supabase
    .from('module_settings')
    .upsert(
      { tenant_id: tenantId, module, key, value, updated_at: new Date().toISOString() },
      { onConflict: 'tenant_id,module,key' }
    );

  if (error) throw new Error(`Errore scrittura module setting: ${error.message}`);
}

export async function listModuleSettings(
  supabase: SupabaseClient,
  tenantId: string,
  module: string
): Promise<ModuleSetting[]> {
  const { data, error } = await supabase
    .from('module_settings')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('module', module)
    .order('key');

  if (error) throw new Error(`Errore lettura module settings: ${error.message}`);
  return (data ?? []) as ModuleSetting[];
}

// --- Entity Settings ---

export async function getEntitySetting(
  supabase: SupabaseClient,
  tenantId: string,
  entityType: string,
  entityId: string,
  key: string
): Promise<unknown | null> {
  const { data, error } = await supabase
    .from('entity_settings')
    .select('value')
    .eq('tenant_id', tenantId)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .eq('key', key)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Errore lettura entity setting: ${error.message}`);
  }
  return (data as { value: unknown }).value;
}

export async function setEntitySetting(
  supabase: SupabaseClient,
  tenantId: string,
  entityType: string,
  entityId: string,
  key: string,
  value: unknown
): Promise<void> {
  const { error } = await supabase
    .from('entity_settings')
    .upsert(
      {
        tenant_id: tenantId,
        entity_type: entityType,
        entity_id: entityId,
        key,
        value,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'tenant_id,entity_type,entity_id,key' }
    );

  if (error) throw new Error(`Errore scrittura entity setting: ${error.message}`);
}

export async function listEntitySettings(
  supabase: SupabaseClient,
  tenantId: string,
  entityType: string,
  entityId: string
): Promise<EntitySetting[]> {
  const { data, error } = await supabase
    .from('entity_settings')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('key');

  if (error) throw new Error(`Errore lettura entity settings: ${error.message}`);
  return (data ?? []) as EntitySetting[];
}
