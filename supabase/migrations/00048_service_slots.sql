-- ============================================================================
-- 00048: Slot orari prenotabili per servizi upselling
-- Estende upsell_offers + aggiunge tabelle per disponibilità e prenotazioni slot
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Estensione upsell_offers: flag slot + durata + max concorrenti
-- ---------------------------------------------------------------------------

ALTER TABLE upsell_offers
  ADD COLUMN IF NOT EXISTS bookable_with_slots BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE upsell_offers
  ADD COLUMN IF NOT EXISTS slot_duration_minutes INTEGER;

ALTER TABLE upsell_offers
  ADD COLUMN IF NOT EXISTS max_concurrent INTEGER NOT NULL DEFAULT 1;

-- ---------------------------------------------------------------------------
-- 2. Regole di disponibilità settimanale per servizio (matrice giorno x fascia)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS service_availability_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES upsell_offers(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (start_time < end_time)
);

CREATE INDEX IF NOT EXISTS idx_service_availability_rules_offer_day
  ON service_availability_rules(offer_id, day_of_week);

-- ---------------------------------------------------------------------------
-- 3. Prenotazioni slot — una riga per prenotazione effettuata
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS service_slot_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES upsell_offers(id) ON DELETE CASCADE,
  reservation_id UUID REFERENCES reservations(id) ON DELETE SET NULL,
  guest_id UUID REFERENCES guests(id) ON DELETE SET NULL,
  slot_date DATE NOT NULL,
  slot_start TIME NOT NULL,
  slot_end TIME NOT NULL,
  participants INTEGER NOT NULL DEFAULT 1 CHECK (participants > 0),
  status TEXT NOT NULL DEFAULT 'confirmed'
    CHECK (status IN ('confirmed', 'cancelled', 'completed', 'no_show')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (slot_start < slot_end)
);

CREATE INDEX IF NOT EXISTS idx_service_slot_bookings_offer_date_start
  ON service_slot_bookings(offer_id, slot_date, slot_start);

CREATE INDEX IF NOT EXISTS idx_service_slot_bookings_reservation
  ON service_slot_bookings(reservation_id) WHERE reservation_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 4. RLS — accesso via catena offer -> entity -> get_user_entity_ids()
-- ---------------------------------------------------------------------------

ALTER TABLE service_availability_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_availability_rules_select
  ON service_availability_rules FOR SELECT
  USING (
    offer_id IN (
      SELECT id FROM upsell_offers
      WHERE entity_id = ANY(get_user_entity_ids())
    )
  );

CREATE POLICY service_availability_rules_insert
  ON service_availability_rules FOR INSERT
  WITH CHECK (
    offer_id IN (
      SELECT id FROM upsell_offers
      WHERE entity_id = ANY(get_user_entity_ids())
    )
  );

CREATE POLICY service_availability_rules_update
  ON service_availability_rules FOR UPDATE
  USING (
    offer_id IN (
      SELECT id FROM upsell_offers
      WHERE entity_id = ANY(get_user_entity_ids())
    )
  );

CREATE POLICY service_availability_rules_delete
  ON service_availability_rules FOR DELETE
  USING (
    offer_id IN (
      SELECT id FROM upsell_offers
      WHERE entity_id = ANY(get_user_entity_ids())
    )
  );

ALTER TABLE service_slot_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_slot_bookings_select
  ON service_slot_bookings FOR SELECT
  USING (
    offer_id IN (
      SELECT id FROM upsell_offers
      WHERE entity_id = ANY(get_user_entity_ids())
    )
  );

CREATE POLICY service_slot_bookings_insert
  ON service_slot_bookings FOR INSERT
  WITH CHECK (
    offer_id IN (
      SELECT id FROM upsell_offers
      WHERE entity_id = ANY(get_user_entity_ids())
    )
  );

CREATE POLICY service_slot_bookings_update
  ON service_slot_bookings FOR UPDATE
  USING (
    offer_id IN (
      SELECT id FROM upsell_offers
      WHERE entity_id = ANY(get_user_entity_ids())
    )
  );

CREATE POLICY service_slot_bookings_delete
  ON service_slot_bookings FOR DELETE
  USING (
    offer_id IN (
      SELECT id FROM upsell_offers
      WHERE entity_id = ANY(get_user_entity_ids())
    )
  );

-- ---------------------------------------------------------------------------
-- 5. Trigger updated_at su service_slot_bookings
-- ---------------------------------------------------------------------------

DROP TRIGGER IF EXISTS update_service_slot_bookings_timestamp ON service_slot_bookings;
CREATE TRIGGER update_service_slot_bookings_timestamp
  BEFORE UPDATE ON service_slot_bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
