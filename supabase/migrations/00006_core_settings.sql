-- 00006: Tabelle impostazioni stratificate — 5 livelli + config_entries unificata
-- Dipende da: tenants (00002), memberships (00004), get_user_tenant_ids() (00001)

-- ============================================================================
-- PLATFORM SETTINGS — solo service_role
-- ============================================================================

CREATE TABLE platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT
);

ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

-- Nessuna policy utente: solo service_role può leggere/scrivere

-- ============================================================================
-- TENANT SETTINGS — impostazioni per tenant
-- ============================================================================

CREATE TABLE tenant_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, key)
);

ALTER TABLE tenant_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_settings_select" ON tenant_settings
  FOR SELECT USING (tenant_id = ANY(get_user_tenant_ids()));
CREATE POLICY "tenant_settings_insert" ON tenant_settings
  FOR INSERT WITH CHECK (tenant_id = ANY(get_user_tenant_ids()));
CREATE POLICY "tenant_settings_update" ON tenant_settings
  FOR UPDATE USING (tenant_id = ANY(get_user_tenant_ids()));
CREATE POLICY "tenant_settings_delete" ON tenant_settings
  FOR DELETE USING (tenant_id = ANY(get_user_tenant_ids()));

CREATE INDEX idx_tenant_settings_tenant ON tenant_settings(tenant_id);

CREATE TRIGGER set_tenant_settings_updated_at
  BEFORE UPDATE ON tenant_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- MODULE ACTIVATIONS — moduli attivati per tenant
-- ============================================================================

CREATE TABLE module_activations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  module TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  activated_at TIMESTAMPTZ DEFAULT NOW(),
  config JSONB DEFAULT '{}',
  UNIQUE(tenant_id, module)
);

ALTER TABLE module_activations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "module_activations_select" ON module_activations
  FOR SELECT USING (tenant_id = ANY(get_user_tenant_ids()));
CREATE POLICY "module_activations_insert" ON module_activations
  FOR INSERT WITH CHECK (tenant_id = ANY(get_user_tenant_ids()));
CREATE POLICY "module_activations_update" ON module_activations
  FOR UPDATE USING (tenant_id = ANY(get_user_tenant_ids()));
CREATE POLICY "module_activations_delete" ON module_activations
  FOR DELETE USING (tenant_id = ANY(get_user_tenant_ids()));

CREATE INDEX idx_module_activations_tenant ON module_activations(tenant_id);

-- ============================================================================
-- MODULE SETTINGS — impostazioni per modulo per tenant
-- ============================================================================

CREATE TABLE module_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  module TEXT NOT NULL,
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, module, key)
);

ALTER TABLE module_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "module_settings_select" ON module_settings
  FOR SELECT USING (tenant_id = ANY(get_user_tenant_ids()));
CREATE POLICY "module_settings_insert" ON module_settings
  FOR INSERT WITH CHECK (tenant_id = ANY(get_user_tenant_ids()));
CREATE POLICY "module_settings_update" ON module_settings
  FOR UPDATE USING (tenant_id = ANY(get_user_tenant_ids()));
CREATE POLICY "module_settings_delete" ON module_settings
  FOR DELETE USING (tenant_id = ANY(get_user_tenant_ids()));

CREATE INDEX idx_module_settings_tenant ON module_settings(tenant_id);

CREATE TRIGGER set_module_settings_updated_at
  BEFORE UPDATE ON module_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- PORTAL SETTINGS — impostazioni per portale per tenant
-- ============================================================================

CREATE TABLE portal_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  portal_type TEXT NOT NULL,
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, portal_type, key)
);

ALTER TABLE portal_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "portal_settings_select" ON portal_settings
  FOR SELECT USING (tenant_id = ANY(get_user_tenant_ids()));
CREATE POLICY "portal_settings_insert" ON portal_settings
  FOR INSERT WITH CHECK (tenant_id = ANY(get_user_tenant_ids()));
CREATE POLICY "portal_settings_update" ON portal_settings
  FOR UPDATE USING (tenant_id = ANY(get_user_tenant_ids()));
CREATE POLICY "portal_settings_delete" ON portal_settings
  FOR DELETE USING (tenant_id = ANY(get_user_tenant_ids()));

CREATE INDEX idx_portal_settings_tenant ON portal_settings(tenant_id);

CREATE TRIGGER set_portal_settings_updated_at
  BEFORE UPDATE ON portal_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- ENTITY SETTINGS — impostazioni per entità specifica
-- ============================================================================

CREATE TABLE entity_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, entity_type, entity_id, key)
);

ALTER TABLE entity_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "entity_settings_select" ON entity_settings
  FOR SELECT USING (tenant_id = ANY(get_user_tenant_ids()));
CREATE POLICY "entity_settings_insert" ON entity_settings
  FOR INSERT WITH CHECK (tenant_id = ANY(get_user_tenant_ids()));
CREATE POLICY "entity_settings_update" ON entity_settings
  FOR UPDATE USING (tenant_id = ANY(get_user_tenant_ids()));
CREATE POLICY "entity_settings_delete" ON entity_settings
  FOR DELETE USING (tenant_id = ANY(get_user_tenant_ids()));

CREATE INDEX idx_entity_settings_tenant ON entity_settings(tenant_id);
CREATE INDEX idx_entity_settings_entity ON entity_settings(entity_type, entity_id);

CREATE TRIGGER set_entity_settings_updated_at
  BEFORE UPDATE ON entity_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- CONFIG ENTRIES — vista unificata multi-scope
-- ============================================================================

CREATE TABLE config_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope TEXT NOT NULL CHECK (scope IN ('platform', 'tenant', 'module', 'entity', 'user')),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  module TEXT,
  entity_type TEXT,
  entity_id UUID,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE config_entries ENABLE ROW LEVEL SECURITY;

-- Scope tenant/module/entity: accesso via tenant membership
CREATE POLICY "config_entries_select_tenant" ON config_entries
  FOR SELECT USING (
    scope IN ('tenant', 'module', 'entity') AND tenant_id = ANY(get_user_tenant_ids())
  );
CREATE POLICY "config_entries_insert_tenant" ON config_entries
  FOR INSERT WITH CHECK (
    scope IN ('tenant', 'module', 'entity') AND tenant_id = ANY(get_user_tenant_ids())
  );
CREATE POLICY "config_entries_update_tenant" ON config_entries
  FOR UPDATE USING (
    scope IN ('tenant', 'module', 'entity') AND tenant_id = ANY(get_user_tenant_ids())
  );
CREATE POLICY "config_entries_delete_tenant" ON config_entries
  FOR DELETE USING (
    scope IN ('tenant', 'module', 'entity') AND tenant_id = ANY(get_user_tenant_ids())
  );

-- Scope user: accesso via auth.uid()
CREATE POLICY "config_entries_select_user" ON config_entries
  FOR SELECT USING (scope = 'user' AND user_id = auth.uid());
CREATE POLICY "config_entries_insert_user" ON config_entries
  FOR INSERT WITH CHECK (scope = 'user' AND user_id = auth.uid());
CREATE POLICY "config_entries_update_user" ON config_entries
  FOR UPDATE USING (scope = 'user' AND user_id = auth.uid());
CREATE POLICY "config_entries_delete_user" ON config_entries
  FOR DELETE USING (scope = 'user' AND user_id = auth.uid());

CREATE INDEX idx_config_entries_scope ON config_entries(scope);
CREATE INDEX idx_config_entries_tenant ON config_entries(tenant_id);
CREATE INDEX idx_config_entries_user ON config_entries(user_id);

CREATE TRIGGER set_config_entries_updated_at
  BEFORE UPDATE ON config_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
