-- 00012: Agenzie — layer multi-tenant per raggruppare più strutture
-- Dipende da: tenants (00002), memberships (00004), profiles (00003)

-- Enum ruolo agenzia
CREATE TYPE agency_role AS ENUM ('agency_owner', 'agency_member');

-- ============================================================================
-- AGENCIES — agenzia che gestisce più tenant/strutture
-- ============================================================================

CREATE TABLE agencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  legal_name TEXT,
  billing_email TEXT,
  billing_phone TEXT,
  vat_number TEXT,
  fiscal_code TEXT,
  address TEXT,
  city TEXT,
  province TEXT,
  zip TEXT,
  country TEXT DEFAULT 'IT',
  website TEXT,
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;

-- Funzione helper: agency_id accessibili dall'utente corrente
CREATE OR REPLACE FUNCTION get_user_agency_ids()
RETURNS UUID[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN COALESCE(
    (SELECT array_agg(agency_id)
     FROM agency_memberships
     WHERE user_id = auth.uid()
       AND is_active = true),
    ARRAY[]::UUID[]
  );
END;
$$;

-- ============================================================================
-- AGENCY MEMBERSHIPS — relazione utente-agenzia
-- ============================================================================

CREATE TABLE agency_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role agency_role NOT NULL DEFAULT 'agency_member',
  is_active BOOLEAN DEFAULT true,
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agency_id, user_id)
);

ALTER TABLE agency_memberships ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Agencies: visibili solo ai membri
CREATE POLICY "agencies_select" ON agencies
  FOR SELECT USING (id = ANY(get_user_agency_ids()));
CREATE POLICY "agencies_insert" ON agencies
  FOR INSERT WITH CHECK (true);
CREATE POLICY "agencies_update" ON agencies
  FOR UPDATE USING (id = ANY(get_user_agency_ids()));
CREATE POLICY "agencies_delete" ON agencies
  FOR DELETE USING (id = ANY(get_user_agency_ids()));

-- Agency memberships: visibili ai membri della stessa agenzia
CREATE POLICY "agency_memberships_select" ON agency_memberships
  FOR SELECT USING (agency_id = ANY(get_user_agency_ids()));
CREATE POLICY "agency_memberships_insert" ON agency_memberships
  FOR INSERT WITH CHECK (agency_id = ANY(get_user_agency_ids()));
CREATE POLICY "agency_memberships_update" ON agency_memberships
  FOR UPDATE USING (agency_id = ANY(get_user_agency_ids()));
CREATE POLICY "agency_memberships_delete" ON agency_memberships
  FOR DELETE USING (agency_id = ANY(get_user_agency_ids()));

-- ============================================================================
-- FK opzionale: tenant può appartenere a un'agenzia
-- ============================================================================

ALTER TABLE tenants ADD COLUMN agency_id UUID REFERENCES agencies(id) ON DELETE SET NULL;
CREATE INDEX idx_tenants_agency ON tenants(agency_id);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_agency_memberships_user ON agency_memberships(user_id);
CREATE INDEX idx_agency_memberships_agency ON agency_memberships(agency_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE TRIGGER set_agencies_updated_at
  BEFORE UPDATE ON agencies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_agency_memberships_updated_at
  BEFORE UPDATE ON agency_memberships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
