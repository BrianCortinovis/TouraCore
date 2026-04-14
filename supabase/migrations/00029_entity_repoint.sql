-- 00029: FK repoint + rename property_id→entity_id + RLS update + properties→properties_legacy
-- Dipende da: 00028 (entities + accommodations + data migration)
-- FASE T03 — IRREVERSIBILE. Backup in .gsd/backups/cloud_pre_00027_*.sql
-- Ordine: drop vecchie policy → drop FK → rename colonne → add nuove FK → update funzioni → update trigger → update view → rename tabella → nuove policy

-- ============================================================================
-- 1. DROP VECCHIE RLS POLICIES che usano get_user_property_ids()
-- ============================================================================

-- room_types (4 policy)
DROP POLICY IF EXISTS "room_types_select" ON room_types;
DROP POLICY IF EXISTS "room_types_insert" ON room_types;
DROP POLICY IF EXISTS "room_types_update" ON room_types;
DROP POLICY IF EXISTS "room_types_delete" ON room_types;

-- rooms (4 policy)
DROP POLICY IF EXISTS "rooms_select" ON rooms;
DROP POLICY IF EXISTS "rooms_insert" ON rooms;
DROP POLICY IF EXISTS "rooms_update" ON rooms;
DROP POLICY IF EXISTS "rooms_delete" ON rooms;

-- room_blocks (4 policy)
DROP POLICY IF EXISTS "room_blocks_select" ON room_blocks;
DROP POLICY IF EXISTS "room_blocks_insert" ON room_blocks;
DROP POLICY IF EXISTS "room_blocks_update" ON room_blocks;
DROP POLICY IF EXISTS "room_blocks_delete" ON room_blocks;

-- rate_plans (4 policy)
DROP POLICY IF EXISTS "rate_plans_select" ON rate_plans;
DROP POLICY IF EXISTS "rate_plans_insert" ON rate_plans;
DROP POLICY IF EXISTS "rate_plans_update" ON rate_plans;
DROP POLICY IF EXISTS "rate_plans_delete" ON rate_plans;

-- seasons (4 policy)
DROP POLICY IF EXISTS "seasons_select" ON seasons;
DROP POLICY IF EXISTS "seasons_insert" ON seasons;
DROP POLICY IF EXISTS "seasons_update" ON seasons;
DROP POLICY IF EXISTS "seasons_delete" ON seasons;

-- rate_prices (4 policy — usa EXISTS su rate_plans.property_id)
DROP POLICY IF EXISTS "rate_prices_select" ON rate_prices;
DROP POLICY IF EXISTS "rate_prices_insert" ON rate_prices;
DROP POLICY IF EXISTS "rate_prices_update" ON rate_prices;
DROP POLICY IF EXISTS "rate_prices_delete" ON rate_prices;

-- staff_members (4 policy)
DROP POLICY IF EXISTS "staff_members_select" ON staff_members;
DROP POLICY IF EXISTS "staff_members_insert" ON staff_members;
DROP POLICY IF EXISTS "staff_members_update" ON staff_members;
DROP POLICY IF EXISTS "staff_members_delete" ON staff_members;

-- ical_feeds (4 policy)
DROP POLICY IF EXISTS "ical_feeds_select" ON ical_feeds;
DROP POLICY IF EXISTS "ical_feeds_insert" ON ical_feeds;
DROP POLICY IF EXISTS "ical_feeds_update" ON ical_feeds;
DROP POLICY IF EXISTS "ical_feeds_delete" ON ical_feeds;

-- properties (4 policy + 1 public read)
DROP POLICY IF EXISTS "properties_select" ON properties;
DROP POLICY IF EXISTS "properties_insert" ON properties;
DROP POLICY IF EXISTS "properties_update" ON properties;
DROP POLICY IF EXISTS "properties_delete" ON properties;
DROP POLICY IF EXISTS "properties_public_read_by_slug" ON properties;

-- public read policies (00022) che referenziano properties per nome tabella
DROP POLICY IF EXISTS "room_types_public_read" ON room_types;
DROP POLICY IF EXISTS "rooms_public_read" ON rooms;
DROP POLICY IF EXISTS "rate_plans_public_read" ON rate_plans;
DROP POLICY IF EXISTS "seasons_public_read" ON seasons;
DROP POLICY IF EXISTS "rate_prices_public_read" ON rate_prices;

-- ============================================================================
-- 2. DROP VECCHI TRIGGER di consistenza (00010) — li ricreiamo aggiornati
-- ============================================================================

DROP TRIGGER IF EXISTS trg_rooms_enforce_property_consistency ON rooms;
DROP FUNCTION IF EXISTS enforce_room_property_consistency();

DROP TRIGGER IF EXISTS trg_rate_prices_enforce_property_consistency ON rate_prices;
DROP FUNCTION IF EXISTS enforce_rate_price_consistency();

-- ============================================================================
-- 3. DROP VIEW v_room_availability (referenzia rooms.property_id)
-- ============================================================================

DROP VIEW IF EXISTS v_room_availability;

-- ============================================================================
-- 4. DROP VECCHI COMPOSITE UNIQUE INDEXES (00010) — li ricreiamo con entity_id
-- ============================================================================

DROP INDEX IF EXISTS idx_room_types_id_property_unique;
DROP INDEX IF EXISTS idx_rooms_id_property_unique;
DROP INDEX IF EXISTS idx_rate_plans_id_property_unique;

-- ============================================================================
-- 5. DROP FK CONSTRAINTS su properties(id) — necessario prima del rename colonna
-- ============================================================================

-- room_types
ALTER TABLE room_types DROP CONSTRAINT IF EXISTS room_types_property_id_fkey;
-- rooms
ALTER TABLE rooms DROP CONSTRAINT IF EXISTS rooms_property_id_fkey;
-- room_blocks
ALTER TABLE room_blocks DROP CONSTRAINT IF EXISTS room_blocks_property_id_fkey;
-- rate_plans
ALTER TABLE rate_plans DROP CONSTRAINT IF EXISTS rate_plans_property_id_fkey;
-- seasons
ALTER TABLE seasons DROP CONSTRAINT IF EXISTS seasons_property_id_fkey;
-- staff_members
ALTER TABLE staff_members DROP CONSTRAINT IF EXISTS staff_members_property_id_fkey;
-- ical_feeds
ALTER TABLE ical_feeds DROP CONSTRAINT IF EXISTS ical_feeds_property_id_fkey;

-- ============================================================================
-- 6. DROP vecchi indici su property_id — li ricreiamo con entity_id
-- ============================================================================

DROP INDEX IF EXISTS idx_room_types_property;
DROP INDEX IF EXISTS idx_rooms_property;
DROP INDEX IF EXISTS idx_room_blocks_dates;
DROP INDEX IF EXISTS idx_room_blocks_room;
DROP INDEX IF EXISTS idx_rate_plans_property;
DROP INDEX IF EXISTS idx_seasons_property;
DROP INDEX IF EXISTS idx_staff_members_property;
DROP INDEX IF EXISTS idx_ical_feeds_property;
DROP INDEX IF EXISTS idx_properties_tenant;
DROP INDEX IF EXISTS idx_properties_slug;

-- ============================================================================
-- 7. RENAME COLUMN property_id → entity_id su tutte le child tables
-- ============================================================================

ALTER TABLE room_types RENAME COLUMN property_id TO entity_id;
ALTER TABLE rooms RENAME COLUMN property_id TO entity_id;
ALTER TABLE room_blocks RENAME COLUMN property_id TO entity_id;
ALTER TABLE rate_plans RENAME COLUMN property_id TO entity_id;
ALTER TABLE seasons RENAME COLUMN property_id TO entity_id;
ALTER TABLE staff_members RENAME COLUMN property_id TO entity_id;
ALTER TABLE ical_feeds RENAME COLUMN property_id TO entity_id;

-- Aggiorna UNIQUE constraint su rooms (property_id, room_number) → (entity_id, room_number)
ALTER TABLE rooms DROP CONSTRAINT IF EXISTS rooms_property_id_room_number_key;
ALTER TABLE rooms ADD CONSTRAINT rooms_entity_id_room_number_key UNIQUE (entity_id, room_number);

-- Aggiorna UNIQUE constraint su staff_members (property_id, user_id) → (entity_id, user_id)
ALTER TABLE staff_members DROP CONSTRAINT IF EXISTS staff_members_property_id_user_id_key;
ALTER TABLE staff_members ADD CONSTRAINT staff_members_entity_id_user_id_key UNIQUE (entity_id, user_id);

-- ============================================================================
-- 8. ADD NUOVE FK su entities(id)
-- ============================================================================

ALTER TABLE room_types ADD CONSTRAINT room_types_entity_id_fkey
  FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE;

ALTER TABLE rooms ADD CONSTRAINT rooms_entity_id_fkey
  FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE;

ALTER TABLE room_blocks ADD CONSTRAINT room_blocks_entity_id_fkey
  FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE;

ALTER TABLE rate_plans ADD CONSTRAINT rate_plans_entity_id_fkey
  FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE;

ALTER TABLE seasons ADD CONSTRAINT seasons_entity_id_fkey
  FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE;

ALTER TABLE staff_members ADD CONSTRAINT staff_members_entity_id_fkey
  FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE;

ALTER TABLE ical_feeds ADD CONSTRAINT ical_feeds_entity_id_fkey
  FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE;

-- ============================================================================
-- 9. RICREA INDICI con entity_id
-- ============================================================================

CREATE INDEX idx_room_types_entity ON room_types(entity_id);
CREATE INDEX idx_rooms_entity ON rooms(entity_id);
CREATE INDEX idx_room_blocks_dates ON room_blocks(entity_id, date_from, date_to);
CREATE INDEX idx_room_blocks_room ON room_blocks(room_id);
CREATE INDEX idx_rate_plans_entity ON rate_plans(entity_id);
CREATE INDEX idx_seasons_entity ON seasons(entity_id);
CREATE INDEX idx_staff_members_entity ON staff_members(entity_id);
CREATE INDEX idx_ical_feeds_entity ON ical_feeds(entity_id);

-- Composite unique indexes per consistency triggers
CREATE UNIQUE INDEX idx_room_types_id_entity_unique ON room_types(id, entity_id);
CREATE UNIQUE INDEX idx_rooms_id_entity_unique ON rooms(id, entity_id);
CREATE UNIQUE INDEX idx_rate_plans_id_entity_unique ON rate_plans(id, entity_id);

-- ============================================================================
-- 10. RICREA RLS POLICIES con get_user_entity_ids()
-- ============================================================================

-- room_types
CREATE POLICY "room_types_select" ON room_types
  FOR SELECT USING (entity_id = ANY(get_user_entity_ids()));
CREATE POLICY "room_types_insert" ON room_types
  FOR INSERT WITH CHECK (entity_id = ANY(get_user_entity_ids()));
CREATE POLICY "room_types_update" ON room_types
  FOR UPDATE USING (entity_id = ANY(get_user_entity_ids()));
CREATE POLICY "room_types_delete" ON room_types
  FOR DELETE USING (entity_id = ANY(get_user_entity_ids()));

-- rooms
CREATE POLICY "rooms_select" ON rooms
  FOR SELECT USING (entity_id = ANY(get_user_entity_ids()));
CREATE POLICY "rooms_insert" ON rooms
  FOR INSERT WITH CHECK (entity_id = ANY(get_user_entity_ids()));
CREATE POLICY "rooms_update" ON rooms
  FOR UPDATE USING (entity_id = ANY(get_user_entity_ids()));
CREATE POLICY "rooms_delete" ON rooms
  FOR DELETE USING (entity_id = ANY(get_user_entity_ids()));

-- room_blocks
CREATE POLICY "room_blocks_select" ON room_blocks
  FOR SELECT USING (entity_id = ANY(get_user_entity_ids()));
CREATE POLICY "room_blocks_insert" ON room_blocks
  FOR INSERT WITH CHECK (entity_id = ANY(get_user_entity_ids()));
CREATE POLICY "room_blocks_update" ON room_blocks
  FOR UPDATE USING (entity_id = ANY(get_user_entity_ids()));
CREATE POLICY "room_blocks_delete" ON room_blocks
  FOR DELETE USING (entity_id = ANY(get_user_entity_ids()));

-- rate_plans
CREATE POLICY "rate_plans_select" ON rate_plans
  FOR SELECT USING (entity_id = ANY(get_user_entity_ids()));
CREATE POLICY "rate_plans_insert" ON rate_plans
  FOR INSERT WITH CHECK (entity_id = ANY(get_user_entity_ids()));
CREATE POLICY "rate_plans_update" ON rate_plans
  FOR UPDATE USING (entity_id = ANY(get_user_entity_ids()));
CREATE POLICY "rate_plans_delete" ON rate_plans
  FOR DELETE USING (entity_id = ANY(get_user_entity_ids()));

-- seasons
CREATE POLICY "seasons_select" ON seasons
  FOR SELECT USING (entity_id = ANY(get_user_entity_ids()));
CREATE POLICY "seasons_insert" ON seasons
  FOR INSERT WITH CHECK (entity_id = ANY(get_user_entity_ids()));
CREATE POLICY "seasons_update" ON seasons
  FOR UPDATE USING (entity_id = ANY(get_user_entity_ids()));
CREATE POLICY "seasons_delete" ON seasons
  FOR DELETE USING (entity_id = ANY(get_user_entity_ids()));

-- rate_prices (EXISTS subquery via rate_plans.entity_id)
CREATE POLICY "rate_prices_select" ON rate_prices
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM rate_plans rp WHERE rp.id = rate_plan_id AND rp.entity_id = ANY(get_user_entity_ids()))
  );
CREATE POLICY "rate_prices_insert" ON rate_prices
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM rate_plans rp WHERE rp.id = rate_plan_id AND rp.entity_id = ANY(get_user_entity_ids()))
  );
CREATE POLICY "rate_prices_update" ON rate_prices
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM rate_plans rp WHERE rp.id = rate_plan_id AND rp.entity_id = ANY(get_user_entity_ids()))
  );
CREATE POLICY "rate_prices_delete" ON rate_prices
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM rate_plans rp WHERE rp.id = rate_plan_id AND rp.entity_id = ANY(get_user_entity_ids()))
  );

-- staff_members
CREATE POLICY "staff_members_select" ON staff_members
  FOR SELECT USING (entity_id = ANY(get_user_entity_ids()));
CREATE POLICY "staff_members_insert" ON staff_members
  FOR INSERT WITH CHECK (entity_id = ANY(get_user_entity_ids()));
CREATE POLICY "staff_members_update" ON staff_members
  FOR UPDATE USING (entity_id = ANY(get_user_entity_ids()));
CREATE POLICY "staff_members_delete" ON staff_members
  FOR DELETE USING (entity_id = ANY(get_user_entity_ids()));

-- ical_feeds
CREATE POLICY "ical_feeds_select" ON ical_feeds
  FOR SELECT USING (entity_id = ANY(get_user_entity_ids()));
CREATE POLICY "ical_feeds_insert" ON ical_feeds
  FOR INSERT WITH CHECK (entity_id = ANY(get_user_entity_ids()));
CREATE POLICY "ical_feeds_update" ON ical_feeds
  FOR UPDATE USING (entity_id = ANY(get_user_entity_ids()));
CREATE POLICY "ical_feeds_delete" ON ical_feeds
  FOR DELETE USING (entity_id = ANY(get_user_entity_ids()));

-- ============================================================================
-- 11. PUBLIC READ POLICIES (sostituzione 00022 — referenzia entities non properties)
-- ============================================================================

CREATE POLICY "room_types_public_read" ON room_types
  FOR SELECT USING (
    is_active = true
    AND entity_id IN (SELECT id FROM entities WHERE is_active = true)
  );

CREATE POLICY "rooms_public_read" ON rooms
  FOR SELECT USING (
    is_active = true
    AND entity_id IN (SELECT id FROM entities WHERE is_active = true)
  );

CREATE POLICY "rate_plans_public_read" ON rate_plans
  FOR SELECT USING (
    is_active = true
    AND is_public = true
    AND entity_id IN (SELECT id FROM entities WHERE is_active = true)
  );

CREATE POLICY "seasons_public_read" ON seasons
  FOR SELECT USING (
    entity_id IN (SELECT id FROM entities WHERE is_active = true)
  );

CREATE POLICY "rate_prices_public_read" ON rate_prices
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM rate_plans rp
      WHERE rp.id = rate_plan_id
        AND rp.is_active = true
        AND rp.is_public = true
        AND rp.entity_id IN (SELECT id FROM entities WHERE is_active = true)
    )
  );

-- ============================================================================
-- 12. RICREA TRIGGER CONSISTENZA (da 00010) con entity_id
-- ============================================================================

CREATE OR REPLACE FUNCTION enforce_room_entity_consistency()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  related_entity UUID;
BEGIN
  SELECT entity_id INTO related_entity
  FROM room_types
  WHERE id = NEW.room_type_id;

  IF related_entity IS NULL OR related_entity <> NEW.entity_id THEN
    RAISE EXCEPTION 'Room type % does not belong to entity %', NEW.room_type_id, NEW.entity_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_rooms_enforce_entity_consistency
BEFORE INSERT OR UPDATE OF entity_id, room_type_id
ON rooms
FOR EACH ROW
EXECUTE FUNCTION enforce_room_entity_consistency();

CREATE OR REPLACE FUNCTION enforce_rate_price_consistency()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  plan_entity UUID;
  type_entity UUID;
BEGIN
  SELECT entity_id INTO plan_entity
  FROM rate_plans
  WHERE id = NEW.rate_plan_id;

  IF plan_entity IS NULL THEN
    RAISE EXCEPTION 'Rate plan % does not exist', NEW.rate_plan_id;
  END IF;

  SELECT entity_id INTO type_entity
  FROM room_types
  WHERE id = NEW.room_type_id;

  IF type_entity IS NULL THEN
    RAISE EXCEPTION 'Room type % does not exist', NEW.room_type_id;
  END IF;

  IF plan_entity <> type_entity THEN
    RAISE EXCEPTION 'Rate plan % (entity %) and room type % (entity %) belong to different entities',
      NEW.rate_plan_id, plan_entity, NEW.room_type_id, type_entity;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_rate_prices_enforce_entity_consistency
BEFORE INSERT OR UPDATE OF rate_plan_id, room_type_id
ON rate_prices
FOR EACH ROW
EXECUTE FUNCTION enforce_rate_price_consistency();

-- ============================================================================
-- 13. RICREA VIEW v_room_availability con entity_id
-- ============================================================================

CREATE OR REPLACE VIEW v_room_availability AS
SELECT
  rm.entity_id,
  rm.id AS room_id,
  rm.room_number,
  rm.floor,
  rm.status AS room_status,
  rt.name AS room_type_name,
  rt.category,
  rb.id AS current_block_id,
  rb.block_type,
  rb.reason AS block_reason,
  rb.date_from AS block_from,
  rb.date_to AS block_to
FROM rooms rm
JOIN room_types rt ON rm.room_type_id = rt.id
LEFT JOIN room_blocks rb ON rm.id = rb.room_id
  AND CURRENT_DATE BETWEEN rb.date_from AND rb.date_to
WHERE rm.is_active = true;

GRANT SELECT ON v_room_availability TO authenticated;

-- ============================================================================
-- 14. DROP get_user_property_ids() — sostituita da get_user_entity_ids()
-- ============================================================================

DROP FUNCTION IF EXISTS get_user_property_ids();

-- ============================================================================
-- 15. RENAME properties → properties_legacy
-- ============================================================================

ALTER TABLE properties RENAME TO properties_legacy;
