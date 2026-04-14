-- 00004: Tabella memberships — collegamento utenti-tenant con ruolo
-- Sostituisce tenant_memberships di Gest con nome più chiaro

CREATE TABLE memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role tenant_role NOT NULL DEFAULT 'member',
  is_active BOOLEAN DEFAULT true,
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, user_id)
);

ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "memberships_select" ON memberships
  FOR SELECT USING (tenant_id = ANY(get_user_tenant_ids()));

CREATE POLICY "memberships_insert" ON memberships
  FOR INSERT WITH CHECK (tenant_id = ANY(get_user_tenant_ids()));

CREATE POLICY "memberships_update" ON memberships
  FOR UPDATE USING (tenant_id = ANY(get_user_tenant_ids()));

CREATE POLICY "memberships_delete" ON memberships
  FOR DELETE USING (tenant_id = ANY(get_user_tenant_ids()));

CREATE INDEX idx_memberships_user ON memberships(user_id);
CREATE INDEX idx_memberships_tenant ON memberships(tenant_id);

CREATE TRIGGER set_memberships_updated_at
  BEFORE UPDATE ON memberships
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
