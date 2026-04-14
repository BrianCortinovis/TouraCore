-- 00043: Sistema integrazioni esterne — credenziali cifrate con scope multi-livello
-- Dipende da: tenants (00002), agencies (00012), entities (00028)

-- ============================================================================
-- INTEGRATION_CREDENTIALS — credenziali cifrate per provider esterni
-- ============================================================================

CREATE TABLE integration_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope TEXT NOT NULL CHECK (scope IN ('tenant', 'agency', 'entity')),
  scope_id UUID NOT NULL,
  provider TEXT NOT NULL,
  credentials_encrypted TEXT NOT NULL DEFAULT '',
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'not_configured' CHECK (status IN ('not_configured', 'configured', 'error')),
  last_sync_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(scope, scope_id, provider)
);

ALTER TABLE integration_credentials ENABLE ROW LEVEL SECURITY;

-- Indici per lookup frequenti
CREATE INDEX idx_integration_credentials_scope ON integration_credentials(scope, scope_id);
CREATE INDEX idx_integration_credentials_provider ON integration_credentials(provider);

-- ============================================================================
-- RLS POLICIES — scope-aware con helper functions esistenti
-- ============================================================================

-- SELECT: l'utente vede credenziali del proprio tenant, agenzia, o entity
CREATE POLICY "integration_credentials_select" ON integration_credentials
  FOR SELECT USING (
    CASE scope
      WHEN 'tenant' THEN scope_id = ANY(get_user_tenant_ids())
      WHEN 'agency' THEN scope_id = ANY(get_user_agency_ids())
      WHEN 'entity' THEN EXISTS (
        SELECT 1 FROM entities e
        WHERE e.id = scope_id
          AND e.tenant_id = ANY(get_user_tenant_ids())
      )
    END
  );

-- INSERT: stesse regole del SELECT
CREATE POLICY "integration_credentials_insert" ON integration_credentials
  FOR INSERT WITH CHECK (
    CASE scope
      WHEN 'tenant' THEN scope_id = ANY(get_user_tenant_ids())
      WHEN 'agency' THEN scope_id = ANY(get_user_agency_ids())
      WHEN 'entity' THEN EXISTS (
        SELECT 1 FROM entities e
        WHERE e.id = scope_id
          AND e.tenant_id = ANY(get_user_tenant_ids())
      )
    END
  );

-- UPDATE: stesse regole
CREATE POLICY "integration_credentials_update" ON integration_credentials
  FOR UPDATE USING (
    CASE scope
      WHEN 'tenant' THEN scope_id = ANY(get_user_tenant_ids())
      WHEN 'agency' THEN scope_id = ANY(get_user_agency_ids())
      WHEN 'entity' THEN EXISTS (
        SELECT 1 FROM entities e
        WHERE e.id = scope_id
          AND e.tenant_id = ANY(get_user_tenant_ids())
      )
    END
  );

-- DELETE: stesse regole
CREATE POLICY "integration_credentials_delete" ON integration_credentials
  FOR DELETE USING (
    CASE scope
      WHEN 'tenant' THEN scope_id = ANY(get_user_tenant_ids())
      WHEN 'agency' THEN scope_id = ANY(get_user_agency_ids())
      WHEN 'entity' THEN EXISTS (
        SELECT 1 FROM entities e
        WHERE e.id = scope_id
          AND e.tenant_id = ANY(get_user_tenant_ids())
      )
    END
  );

-- ============================================================================
-- TRIGGER updated_at
-- ============================================================================

CREATE TRIGGER set_integration_credentials_updated_at
  BEFORE UPDATE ON integration_credentials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
