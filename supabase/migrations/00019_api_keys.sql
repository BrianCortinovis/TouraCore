-- 00019: API keys per accesso REST API esterno
-- Dipende da: tenants (00002)

CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  scopes TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "api_keys_select" ON api_keys
  FOR SELECT USING (tenant_id = ANY(get_user_tenant_ids()));
CREATE POLICY "api_keys_insert" ON api_keys
  FOR INSERT WITH CHECK (tenant_id = ANY(get_user_tenant_ids()));
CREATE POLICY "api_keys_update" ON api_keys
  FOR UPDATE USING (tenant_id = ANY(get_user_tenant_ids()));
CREATE POLICY "api_keys_delete" ON api_keys
  FOR DELETE USING (tenant_id = ANY(get_user_tenant_ids()));

CREATE INDEX idx_api_keys_tenant ON api_keys(tenant_id);
CREATE INDEX idx_api_keys_prefix ON api_keys(key_prefix);

-- Webhook endpoints configurati dal tenant
CREATE TABLE webhook_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  secret TEXT NOT NULL,
  events TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE webhook_endpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "webhook_endpoints_select" ON webhook_endpoints
  FOR SELECT USING (tenant_id = ANY(get_user_tenant_ids()));
CREATE POLICY "webhook_endpoints_insert" ON webhook_endpoints
  FOR INSERT WITH CHECK (tenant_id = ANY(get_user_tenant_ids()));
CREATE POLICY "webhook_endpoints_update" ON webhook_endpoints
  FOR UPDATE USING (tenant_id = ANY(get_user_tenant_ids()));
CREATE POLICY "webhook_endpoints_delete" ON webhook_endpoints
  FOR DELETE USING (tenant_id = ANY(get_user_tenant_ids()));
