-- 00013: Staff members — collegamento utente-proprietà con ruolo operativo
-- Dipende da: properties (00007), staff_role enum (00001)

CREATE TABLE staff_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role staff_role NOT NULL DEFAULT 'receptionist',
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  permissions JSONB DEFAULT '{}',
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(property_id, user_id)
);

ALTER TABLE staff_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_members_select" ON staff_members
  FOR SELECT USING (property_id = ANY(get_user_property_ids()));
CREATE POLICY "staff_members_insert" ON staff_members
  FOR INSERT WITH CHECK (property_id = ANY(get_user_property_ids()));
CREATE POLICY "staff_members_update" ON staff_members
  FOR UPDATE USING (property_id = ANY(get_user_property_ids()));
CREATE POLICY "staff_members_delete" ON staff_members
  FOR DELETE USING (property_id = ANY(get_user_property_ids()));

CREATE INDEX idx_staff_members_property ON staff_members(property_id);
CREATE INDEX idx_staff_members_user ON staff_members(user_id);

CREATE TRIGGER set_staff_members_updated_at
  BEFORE UPDATE ON staff_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
