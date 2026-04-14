-- 00034: Check-in/Check-out + Alloggiati Web compliance
-- Dipende da: entities (00028), bookings (00016), guests (00033)
-- Aggiunge: entity_id su bookings, stati checked_in/checked_out,
--           actual_check_in/out, police_registrations, checkin_tokens

-- ============================================================================
-- 1. ESTENSIONE BOOKINGS — entity_id + check-in/out tracking
-- ============================================================================

-- Collega booking a entity specifica
ALTER TABLE bookings ADD COLUMN entity_id UUID REFERENCES entities(id) ON DELETE SET NULL;
CREATE INDEX idx_bookings_entity ON bookings(entity_id) WHERE entity_id IS NOT NULL;

-- Timestamp effettivi check-in/out (distinti da date previste check_in/check_out)
ALTER TABLE bookings ADD COLUMN actual_check_in TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN actual_check_out TIMESTAMPTZ;

-- Flag online check-in completato
ALTER TABLE bookings ADD COLUMN online_checkin_completed BOOLEAN DEFAULT false;
ALTER TABLE bookings ADD COLUMN online_checkin_at TIMESTAMPTZ;

-- Dati animali domestici (raccolti durante check-in)
ALTER TABLE bookings ADD COLUMN pet_count INTEGER DEFAULT 0;
ALTER TABLE bookings ADD COLUMN pet_details JSONB;

-- Estendere vincolo status con checked_in / checked_out
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_status_check
  CHECK (status IN ('pending', 'confirmed', 'checked_in', 'checked_out', 'canceled', 'completed', 'no_show'));

-- ============================================================================
-- 2. POLICE_REGISTRATIONS — Alloggiati Web (Questura)
-- ============================================================================

CREATE TYPE alloggiati_status AS ENUM ('pending', 'generated', 'sent', 'confirmed', 'error');

CREATE TABLE police_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,

  registration_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Snapshot dati ospite al momento della registrazione
  last_name TEXT NOT NULL,
  first_name TEXT NOT NULL,
  gender TEXT CHECK (gender IN ('M', 'F')),
  date_of_birth DATE NOT NULL,
  birth_place TEXT NOT NULL,
  birth_province TEXT,
  birth_country TEXT NOT NULL,
  citizenship TEXT NOT NULL,

  -- Documento
  document_type TEXT NOT NULL,
  document_number TEXT NOT NULL,
  document_issued_by TEXT,

  -- Tipo ospite (16=singolo/capo, 17=familiare, 18=membro gruppo)
  is_primary BOOLEAN DEFAULT true,
  group_leader_id UUID REFERENCES police_registrations(id),

  -- Stato trasmissione
  alloggiati_status alloggiati_status DEFAULT 'pending',
  file_content TEXT,
  sent_at TIMESTAMPTZ,
  response_message TEXT,
  error_details TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE police_registrations ENABLE ROW LEVEL SECURITY;

-- RLS entity-scoped
CREATE POLICY "police_registrations_select" ON police_registrations
  FOR SELECT USING (entity_id = ANY(get_user_entity_ids()));

CREATE POLICY "police_registrations_insert" ON police_registrations
  FOR INSERT WITH CHECK (entity_id = ANY(get_user_entity_ids()));

CREATE POLICY "police_registrations_update" ON police_registrations
  FOR UPDATE USING (entity_id = ANY(get_user_entity_ids()));

CREATE POLICY "police_registrations_delete" ON police_registrations
  FOR DELETE USING (entity_id = ANY(get_user_entity_ids()));

CREATE INDEX idx_police_reg_entity ON police_registrations(entity_id);
CREATE INDEX idx_police_reg_booking ON police_registrations(booking_id);
CREATE INDEX idx_police_reg_guest ON police_registrations(guest_id);
CREATE INDEX idx_police_reg_date ON police_registrations(entity_id, registration_date);
CREATE INDEX idx_police_reg_status ON police_registrations(alloggiati_status);

CREATE TRIGGER set_police_registrations_updated_at
  BEFORE UPDATE ON police_registrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Vincolo unicità: un solo record per ospite/booking/data
ALTER TABLE police_registrations
  ADD CONSTRAINT police_reg_unique_per_day
  UNIQUE (booking_id, guest_id, registration_date);

-- ============================================================================
-- 3. CHECKIN_TOKENS — self check-in online
-- ============================================================================

CREATE TABLE checkin_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'started', 'completed', 'expired')),

  -- Dati raccolti durante check-in online (JSONB progressivo)
  guest_data JSONB DEFAULT '{}'::jsonb,
  document_front_url TEXT,
  document_back_url TEXT,
  privacy_signed BOOLEAN DEFAULT false,
  privacy_signed_at TIMESTAMPTZ,
  arrival_time TEXT,
  special_requests TEXT,

  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE checkin_tokens ENABLE ROW LEVEL SECURITY;

-- RLS entity-scoped (staff vede i token delle proprie entity)
CREATE POLICY "checkin_tokens_select" ON checkin_tokens
  FOR SELECT USING (entity_id = ANY(get_user_entity_ids()));

CREATE POLICY "checkin_tokens_insert" ON checkin_tokens
  FOR INSERT WITH CHECK (entity_id = ANY(get_user_entity_ids()));

CREATE POLICY "checkin_tokens_update" ON checkin_tokens
  FOR UPDATE USING (entity_id = ANY(get_user_entity_ids()));

CREATE INDEX idx_checkin_tokens_token ON checkin_tokens(token);
CREATE INDEX idx_checkin_tokens_booking ON checkin_tokens(booking_id);
CREATE INDEX idx_checkin_tokens_entity ON checkin_tokens(entity_id);
CREATE INDEX idx_checkin_tokens_status ON checkin_tokens(status) WHERE status IN ('pending', 'started');
