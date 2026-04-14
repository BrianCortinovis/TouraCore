-- 00002: Tabella tenants — entità radice multi-tenant
-- Nessuna colonna verticale-specifica; le impostazioni vanno in tenant_settings

CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  legal_name TEXT,
  billing_email TEXT,
  billing_phone TEXT,
  vat_number TEXT,
  fiscal_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenants_select" ON tenants
  FOR SELECT USING (id = ANY(get_user_tenant_ids()));

CREATE POLICY "tenants_insert" ON tenants
  FOR INSERT WITH CHECK (id = ANY(get_user_tenant_ids()));

CREATE POLICY "tenants_update" ON tenants
  FOR UPDATE USING (id = ANY(get_user_tenant_ids()));

CREATE POLICY "tenants_delete" ON tenants
  FOR DELETE USING (id = ANY(get_user_tenant_ids()));

CREATE TRIGGER set_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
