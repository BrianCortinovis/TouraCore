-- 00033: Tabella guests — registro ospiti per hospitality
-- Dipende da: entities (00028), get_user_entity_ids() (00028)
-- Scoping: entity_id (una property/accommodation = un registro ospiti)

-- ============================================================================
-- 1. TABELLA GUESTS
-- ============================================================================

CREATE TABLE guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,

  -- Anagrafica
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  mobile TEXT,
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('M', 'F', 'other')),

  -- Documento identità (compliance Alloggiati Web / Questura)
  document_type TEXT CHECK (document_type IN ('id_card', 'passport', 'driving_license', 'residence_permit')),
  document_number TEXT,
  document_issued_by TEXT,
  document_issued_date DATE,
  document_expiry_date DATE,
  document_country TEXT,
  document_scan_url TEXT,

  -- Indirizzo
  address TEXT,
  city TEXT,
  province TEXT,
  zip TEXT,
  country TEXT,

  -- Dati italiani per compliance
  nationality TEXT,
  citizenship TEXT,
  fiscal_code TEXT,
  birth_place TEXT,
  birth_province TEXT,
  birth_country TEXT,

  -- Dati aziendali (fatturazione B2B)
  company_name TEXT,
  company_vat TEXT,
  company_sdi TEXT,
  company_pec TEXT,

  -- CRM
  preferences JSONB DEFAULT '{}'::jsonb,
  tags TEXT[] DEFAULT '{}',
  internal_notes TEXT,

  -- Statistiche denormalizzate (aggiornate via trigger o batch)
  total_stays INTEGER DEFAULT 0,
  total_nights INTEGER DEFAULT 0,
  total_revenue NUMERIC(12, 2) DEFAULT 0,
  last_stay_date DATE,

  -- Consensi GDPR
  privacy_consent BOOLEAN DEFAULT false,
  privacy_consent_date TIMESTAMPTZ,
  marketing_consent BOOLEAN DEFAULT false,
  marketing_consent_date TIMESTAMPTZ,

  -- Loyalty
  loyalty_level TEXT CHECK (loyalty_level IN ('bronze', 'silver', 'gold', 'platinum')),
  loyalty_points INTEGER DEFAULT 0,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE guests ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. RLS POLICIES — entity-scoped
-- ============================================================================

CREATE POLICY "guests_select" ON guests
  FOR SELECT USING (entity_id = ANY(get_user_entity_ids()));

CREATE POLICY "guests_insert" ON guests
  FOR INSERT WITH CHECK (entity_id = ANY(get_user_entity_ids()));

CREATE POLICY "guests_update" ON guests
  FOR UPDATE USING (entity_id = ANY(get_user_entity_ids()));

CREATE POLICY "guests_delete" ON guests
  FOR DELETE USING (entity_id = ANY(get_user_entity_ids()));

-- ============================================================================
-- 3. INDEXES
-- ============================================================================

CREATE INDEX idx_guests_entity ON guests(entity_id);
CREATE INDEX idx_guests_name ON guests(entity_id, last_name, first_name);
CREATE INDEX idx_guests_email ON guests(entity_id, email) WHERE email IS NOT NULL;
CREATE INDEX idx_guests_fiscal_code ON guests(entity_id, fiscal_code) WHERE fiscal_code IS NOT NULL;
CREATE INDEX idx_guests_country ON guests(entity_id, country) WHERE country IS NOT NULL;
CREATE INDEX idx_guests_search ON guests USING gin((first_name || ' ' || last_name) gin_trgm_ops);
CREATE INDEX idx_guests_tags ON guests USING gin(tags);

-- ============================================================================
-- 4. TRIGGER updated_at
-- ============================================================================

CREATE TRIGGER set_guests_updated_at
  BEFORE UPDATE ON guests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- 5. FK opzionale: guest_id su bookings (nullable, per link progressivo)
-- ============================================================================

ALTER TABLE bookings ADD COLUMN guest_id UUID REFERENCES guests(id) ON DELETE SET NULL;
CREATE INDEX idx_bookings_guest_id ON bookings(guest_id) WHERE guest_id IS NOT NULL;
