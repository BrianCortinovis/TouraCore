-- Tabella configurazioni self check-in per camera
CREATE TABLE IF NOT EXISTS self_checkin_configs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id   UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  room_id     UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  access_type TEXT NOT NULL DEFAULT 'key_handoff'
    CHECK (access_type IN ('keybox', 'smart_lock', 'code_panel', 'key_handoff')),
  access_code        TEXT,
  wifi_network       TEXT,
  wifi_password      TEXT,
  checkin_instructions  TEXT,
  checkout_instructions TEXT,
  house_rules        TEXT,
  smart_lock_provider  TEXT,
  smart_lock_device_id TEXT,
  auto_send          BOOLEAN NOT NULL DEFAULT false,
  send_hours_before  INTEGER NOT NULL DEFAULT 24,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (entity_id, room_id)
);

-- Colonna self_checkin_enabled su accommodations
ALTER TABLE accommodations
  ADD COLUMN IF NOT EXISTS self_checkin_enabled BOOLEAN NOT NULL DEFAULT false;

-- RLS
ALTER TABLE self_checkin_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "self_checkin_configs_entity_isolation"
  ON self_checkin_configs
  FOR ALL
  USING (entity_id = ANY(get_user_entity_ids()))
  WITH CHECK (entity_id = ANY(get_user_entity_ids()));

-- Aggiorna anche checkin_tokens per puntare a reservations invece di bookings
-- (booking_id viene rinominato reservation_id)
ALTER TABLE checkin_tokens
  RENAME COLUMN booking_id TO reservation_id;

-- Indici
CREATE INDEX IF NOT EXISTS idx_self_checkin_configs_entity
  ON self_checkin_configs(entity_id);

-- Trigger updated_at
CREATE TRIGGER set_updated_at_self_checkin_configs
  BEFORE UPDATE ON self_checkin_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
