-- 00020: iCal sync per sincronizzazione calendario esterno
-- Dipende da: properties (00007)

CREATE TABLE ical_feeds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  room_type_id UUID REFERENCES room_types(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  direction TEXT NOT NULL DEFAULT 'import' CHECK (direction IN ('import', 'export')),
  sync_interval_minutes INTEGER DEFAULT 60,
  last_synced_at TIMESTAMPTZ,
  last_sync_error TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ical_feeds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ical_feeds_select" ON ical_feeds
  FOR SELECT USING (property_id = ANY(get_user_property_ids()));
CREATE POLICY "ical_feeds_insert" ON ical_feeds
  FOR INSERT WITH CHECK (property_id = ANY(get_user_property_ids()));
CREATE POLICY "ical_feeds_update" ON ical_feeds
  FOR UPDATE USING (property_id = ANY(get_user_property_ids()));
CREATE POLICY "ical_feeds_delete" ON ical_feeds
  FOR DELETE USING (property_id = ANY(get_user_property_ids()));

CREATE INDEX idx_ical_feeds_property ON ical_feeds(property_id);
