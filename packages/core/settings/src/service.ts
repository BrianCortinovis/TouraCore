import type { SupabaseClient } from '@supabase/supabase-js';
import type { ResolvedSetting } from './types';
import {
  getPlatformSetting,
  getTenantSetting,
  getModuleSetting,
  getEntitySetting,
} from './queries';

export interface ResolutionContext {
  tenantId?: string;
  module?: string;
  entityType?: string;
  entityId?: string;
}

/**
 * Risolve un setting con cascading: entity > module > tenant > platform.
 * Restituisce il primo valore trovato nella catena.
 */
export async function resolveSetting(
  supabase: SupabaseClient,
  key: string,
  ctx: ResolutionContext
): Promise<ResolvedSetting | null> {
  if (ctx.entityType && ctx.entityId && ctx.tenantId) {
    const value = await getEntitySetting(
      supabase,
      ctx.tenantId,
      ctx.entityType,
      ctx.entityId,
      key
    );
    if (value !== null) {
      return { key, value, source: 'entity', sourceId: ctx.entityId };
    }
  }

  if (ctx.module && ctx.tenantId) {
    const value = await getModuleSetting(supabase, ctx.tenantId, ctx.module, key);
    if (value !== null) {
      return { key, value, source: 'module', sourceId: ctx.module };
    }
  }

  if (ctx.tenantId) {
    const value = await getTenantSetting(supabase, ctx.tenantId, key);
    if (value !== null) {
      return { key, value, source: 'tenant', sourceId: ctx.tenantId };
    }
  }

  const value = await getPlatformSetting(supabase, key);
  if (value !== null) {
    return { key, value, source: 'platform' };
  }

  return null;
}

/**
 * Risolve più settings in batch.
 */
export async function resolveSettings(
  supabase: SupabaseClient,
  keys: string[],
  ctx: ResolutionContext
): Promise<Map<string, ResolvedSetting>> {
  const results = new Map<string, ResolvedSetting>();

  const resolved = await Promise.all(
    keys.map((key) => resolveSetting(supabase, key, ctx))
  );

  for (let i = 0; i < keys.length; i++) {
    const r = resolved[i];
    if (r) {
      results.set(keys[i] as string, r);
    }
  }

  return results;
}

/**
 * Restituisce il valore risolto o un default.
 */
export async function getSettingOrDefault<T>(
  supabase: SupabaseClient,
  key: string,
  ctx: ResolutionContext,
  defaultValue: T
): Promise<T> {
  const resolved = await resolveSetting(supabase, key, ctx);
  if (resolved === null) return defaultValue;
  return resolved.value as T;
}
