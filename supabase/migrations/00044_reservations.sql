-- 00044: Tabella reservations — gestione PMS prenotazioni per hospitality
-- Dipende da: entities (00028), guests (00033), rooms/room_types (00007→00029), rate_plans (00008→00029)
-- Sostituisce bookings per gestione PMS; bookings resta per widget/portale pubblico

-- ============================================================================
-- 1. ENUM TYPES
-- ============================================================================

CREATE TYPE reservation_status AS ENUM (
  'inquiry', 'option', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show'
);

CREATE TYPE booking_source AS ENUM (
  'direct', 'booking_com', 'expedia', 'airbnb', 'google', 'tripadvisor',
  'phone', 'walk_in', 'website', 'email', 'agency', 'other'
);

CREATE TYPE meal_plan AS ENUM (
  'room_only', 'breakfast', 'half_board', 'full_board', 'all_inclusive'
);

CREATE TYPE ota_payment_type AS ENUM (
  'ota_collect', 'virtual_card', 'pay_at_property', 'split'
);

-- ============================================================================
-- 2. FUNZIONE generate_reservation_code
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_reservation_code(org_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  year_part TEXT;
  seq_num INTEGER;
  code TEXT;
BEGIN
  year_part := to_char(NOW(), 'YYYY');

  SELECT COALESCE(MAX(
    CAST(SUBSTRING(reservation_code FROM 'RES-\d{4}-(\d+)') AS INTEGER)
  ), 0) + 1
  INTO seq_num
  FROM reservations
  WHERE entity_id = org_id
    AND reservation_code LIKE 'RES-' || year_part || '-%';

  code := 'RES-' || year_part || '-' || LPAD(seq_num::TEXT, 5, '0');
  RETURN code;
END;
$$;

-- ============================================================================
-- 3. TABELLA RESERVATIONS
-- ============================================================================

CREATE TABLE reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  reservation_code TEXT NOT NULL,

  -- Ospite e camera
  guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE RESTRICT,
  room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
  room_type_id UUID NOT NULL REFERENCES room_types(id) ON DELETE RESTRICT,
  rate_plan_id UUID REFERENCES rate_plans(id) ON DELETE SET NULL,

  -- Date
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  actual_check_in TIMESTAMPTZ,
  actual_check_out TIMESTAMPTZ,

  -- Stato
  status reservation_status NOT NULL DEFAULT 'confirmed',
  source booking_source NOT NULL DEFAULT 'direct',

  -- Occupazione
  adults INTEGER NOT NULL DEFAULT 1 CHECK (adults >= 1),
  children INTEGER NOT NULL DEFAULT 0 CHECK (children >= 0),
  infants INTEGER NOT NULL DEFAULT 0 CHECK (infants >= 0),
  pet_count INTEGER NOT NULL DEFAULT 0 CHECK (pet_count >= 0),
  pet_details JSONB DEFAULT '[]'::jsonb,
  meal_plan meal_plan NOT NULL DEFAULT 'room_only',

  -- Finanze
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  commission_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  commission_rate NUMERIC(5, 2) NOT NULL DEFAULT 0,
  balance NUMERIC(12, 2) GENERATED ALWAYS AS (total_amount - paid_amount) STORED,

  -- Canale OTA
  channel_reservation_id TEXT,
  channel_confirmation_code TEXT,
  channel_name TEXT,
  ota_payment_type ota_payment_type,
  ota_prepaid_amount NUMERIC(10, 2) DEFAULT 0,
  ota_net_remittance NUMERIC(10, 2) DEFAULT 0,

  -- Note
  special_requests TEXT,
  internal_notes TEXT,

  -- Gruppo
  group_id UUID,
  group_name TEXT,

  -- Cancellazione
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,

  -- Audit
  created_by UUID REFERENCES auth.users(id),
  last_modified_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Vincoli
  CONSTRAINT reservations_dates_check CHECK (check_out > check_in),
  CONSTRAINT reservations_code_unique UNIQUE (entity_id, reservation_code)
);

-- ============================================================================
-- 4. RLS — entity-scoped con supporto agency
-- ============================================================================

ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reservations_select" ON reservations
  FOR SELECT USING (entity_id = ANY(get_user_entity_ids()));

CREATE POLICY "reservations_insert" ON reservations
  FOR INSERT WITH CHECK (entity_id = ANY(get_user_entity_ids()));

CREATE POLICY "reservations_update" ON reservations
  FOR UPDATE USING (entity_id = ANY(get_user_entity_ids()));

CREATE POLICY "reservations_delete" ON reservations
  FOR DELETE USING (entity_id = ANY(get_user_entity_ids()));

-- ============================================================================
-- 5. INDICI
-- ============================================================================

CREATE INDEX idx_reservations_entity ON reservations(entity_id);
CREATE INDEX idx_reservations_dates ON reservations(entity_id, check_in, check_out);
CREATE INDEX idx_reservations_status ON reservations(entity_id, status);
CREATE INDEX idx_reservations_guest ON reservations(guest_id);
CREATE INDEX idx_reservations_room ON reservations(room_id) WHERE room_id IS NOT NULL;
CREATE INDEX idx_reservations_code ON reservations(reservation_code);
CREATE INDEX idx_reservations_channel ON reservations(channel_reservation_id) WHERE channel_reservation_id IS NOT NULL;
CREATE INDEX idx_reservations_checkin_date ON reservations(check_in) WHERE status IN ('confirmed', 'option');
CREATE INDEX idx_reservations_checkout_date ON reservations(check_out) WHERE status = 'checked_in';

-- ============================================================================
-- 6. TRIGGER updated_at
-- ============================================================================

CREATE TRIGGER set_reservations_updated_at
  BEFORE UPDATE ON reservations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- 7. COMMENTO su bookings — chiarisce ruolo residuo
-- ============================================================================

COMMENT ON TABLE bookings IS 'Prenotazioni da widget/portale pubblico cross-vertical. Per gestione PMS hospitality vedi tabella reservations.';
