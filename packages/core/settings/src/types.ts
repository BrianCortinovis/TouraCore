import { z } from 'zod';

export type SettingsScope = 'platform' | 'tenant' | 'module' | 'entity' | 'user';

export interface TenantSetting {
  id: string;
  tenant_id: string;
  key: string;
  value: unknown;
  created_at: string;
  updated_at: string;
}

export interface ModuleActivation {
  id: string;
  tenant_id: string;
  module: string;
  is_active: boolean;
  activated_at: string;
  config: Record<string, unknown>;
}

export interface ModuleSetting {
  id: string;
  tenant_id: string;
  module: string;
  key: string;
  value: unknown;
  created_at: string;
  updated_at: string;
}

export interface EntitySetting {
  id: string;
  tenant_id: string;
  entity_type: string;
  entity_id: string;
  key: string;
  value: unknown;
  created_at: string;
  updated_at: string;
}

export interface ConfigEntry {
  id: string;
  scope: SettingsScope;
  tenant_id: string | null;
  module: string | null;
  entity_type: string | null;
  entity_id: string | null;
  user_id: string | null;
  key: string;
  value: unknown;
  created_at: string;
  updated_at: string;
}

export const SetSettingSchema = z.object({
  key: z.string().min(1).max(255),
  value: z.unknown(),
});

export const ModuleToggleSchema = z.object({
  module: z.string().min(1).max(100),
  is_active: z.boolean(),
});

export const EntitySettingSchema = z.object({
  entity_type: z.string().min(1).max(100),
  entity_id: z.string().uuid(),
  key: z.string().min(1).max(255),
  value: z.unknown(),
});

export interface ResolvedSetting {
  key: string;
  value: unknown;
  source: SettingsScope;
  sourceId?: string;
}
