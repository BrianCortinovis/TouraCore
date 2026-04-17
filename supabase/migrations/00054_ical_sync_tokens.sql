-- 00054: iCal sync tokens + room scoping per export bidirezionale
-- Dipende da: 00020_ical_sync, 00029_entity_repoint

-- Export token per URL pubblici firmati (una volta generato, non cambia)
ALTER TABLE ical_feeds
  ADD COLUMN IF NOT EXISTS export_token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS last_sync_count INTEGER,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Genera token per feed export esistenti
UPDATE ical_feeds
SET export_token = replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
WHERE direction = 'export' AND export_token IS NULL;

-- Trigger export_token auto su insert direction='export'
CREATE OR REPLACE FUNCTION ical_feeds_generate_export_token()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.direction = 'export' AND NEW.export_token IS NULL THEN
    NEW.export_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_ical_feeds_export_token ON ical_feeds;
CREATE TRIGGER set_ical_feeds_export_token
  BEFORE INSERT ON ical_feeds
  FOR EACH ROW EXECUTE FUNCTION ical_feeds_generate_export_token();

DROP TRIGGER IF EXISTS set_ical_feeds_updated_at ON ical_feeds;
CREATE TRIGGER set_ical_feeds_updated_at
  BEFORE UPDATE ON ical_feeds
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX IF NOT EXISTS idx_ical_feeds_export_token ON ical_feeds(export_token) WHERE export_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ical_feeds_room ON ical_feeds(room_id) WHERE room_id IS NOT NULL;

-- Track source feed sui room_blocks creati da import iCal (dedup per UID)
ALTER TABLE room_blocks
  ADD COLUMN IF NOT EXISTS ical_feed_id UUID REFERENCES ical_feeds(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ical_uid TEXT;

CREATE INDEX IF NOT EXISTS idx_room_blocks_ical_uid ON room_blocks(ical_feed_id, ical_uid) WHERE ical_uid IS NOT NULL;
