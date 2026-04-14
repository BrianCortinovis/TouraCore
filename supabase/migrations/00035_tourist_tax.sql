-- 00035: Tassa di soggiorno — tariffe + registrazioni
-- Dipende da: 00028 (entities_tables), 00033 (guests), 00034 (checkin)

-- ============================================================================
-- 1. COLONNE SU ACCOMMODATIONS
-- ============================================================================

ALTER TABLE accommodations
  ADD COLUMN tourist_tax_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN tourist_tax_max_nights INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN tourist_tax_municipality TEXT;

-- ============================================================================
-- 2. TABELLA TARIFFE PER ENTITY
-- ============================================================================

CREATE TABLE tourist_tax_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('adult', 'teen_14_17', 'child_10_13', 'child_0_9')),
  rate_per_person DECIMAL(8,2) NOT NULL DEFAULT 0,
  is_exempt BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  max_nights INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(entity_id, category)
);

-- ============================================================================
-- 3. TABELLA REGISTRAZIONI TASSA
-- ============================================================================

CREATE TABLE tourist_tax_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  reservation_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  guest_id UUID REFERENCES guests(id) ON DELETE SET NULL,
  tax_date DATE NOT NULL,
  nights INTEGER NOT NULL CHECK (nights > 0),
  guests_count INTEGER NOT NULL CHECK (guests_count > 0),
  rate_per_person DECIMAL(8,2) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  is_exempt BOOLEAN NOT NULL DEFAULT false,
  exemption_reason TEXT,
  is_collected BOOLEAN NOT NULL DEFAULT false,
  collected_at TIMESTAMPTZ,
  payment_method TEXT CHECK (payment_method IN ('cash', 'credit_card', 'debit_card', 'bank_transfer', 'pos', 'online', 'check')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indici
CREATE INDEX idx_tourist_tax_rates_entity ON tourist_tax_rates(entity_id);
CREATE INDEX idx_tourist_tax_records_entity ON tourist_tax_records(entity_id);
CREATE INDEX idx_tourist_tax_records_reservation ON tourist_tax_records(reservation_id);
CREATE INDEX idx_tourist_tax_records_date ON tourist_tax_records(entity_id, tax_date);

-- ============================================================================
-- 4. RLS — deny-by-default, entity-scoped
-- ============================================================================

ALTER TABLE tourist_tax_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE tourist_tax_records ENABLE ROW LEVEL SECURITY;

-- Rates: SELECT/UPDATE/DELETE via entity membership
CREATE POLICY "rates_select" ON tourist_tax_rates
  FOR SELECT USING (
    entity_id = ANY(get_user_entity_ids())
  );

CREATE POLICY "rates_insert" ON tourist_tax_rates
  FOR INSERT WITH CHECK (
    entity_id = ANY(get_user_entity_ids())
  );

CREATE POLICY "rates_update" ON tourist_tax_rates
  FOR UPDATE USING (
    entity_id = ANY(get_user_entity_ids())
  );

CREATE POLICY "rates_delete" ON tourist_tax_rates
  FOR DELETE USING (
    entity_id = ANY(get_user_entity_ids())
  );

-- Records: entity-scoped
CREATE POLICY "records_select" ON tourist_tax_records
  FOR SELECT USING (
    entity_id = ANY(get_user_entity_ids())
  );

CREATE POLICY "records_insert" ON tourist_tax_records
  FOR INSERT WITH CHECK (
    entity_id = ANY(get_user_entity_ids())
  );

CREATE POLICY "records_update" ON tourist_tax_records
  FOR UPDATE USING (
    entity_id = ANY(get_user_entity_ids())
  );

CREATE POLICY "records_delete" ON tourist_tax_records
  FOR DELETE USING (
    entity_id = ANY(get_user_entity_ids())
  );
