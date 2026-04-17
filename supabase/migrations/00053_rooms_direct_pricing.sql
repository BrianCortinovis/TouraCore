-- 00053: Direct pricing/settings on rooms per struct senza tipologia
-- Per casa_vacanze/b_and_b/agriturismo/affittacamere ogni room ha prezzo/meta propri.
-- hotel/residence continuano a usare room_types (prezzo su tipologia).
-- Colonne opzionali: se NULL fallback su room_type.base_price/etc.

-- ============================================================================
-- 1. Estensione tabella rooms
-- ============================================================================

ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS base_price NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS base_occupancy INTEGER,
  ADD COLUMN IF NOT EXISTS max_occupancy INTEGER,
  ADD COLUMN IF NOT EXISTS max_children INTEGER,
  ADD COLUMN IF NOT EXISTS size_sqm NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS bed_configuration TEXT,
  ADD COLUMN IF NOT EXISTS amenities JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS photos TEXT[] DEFAULT ARRAY[]::TEXT[];

-- ============================================================================
-- 2. View consolidata: rooms con prezzo effettivo (room override oppure type fallback)
-- ============================================================================

CREATE OR REPLACE VIEW v_rooms_effective AS
SELECT
  r.id,
  r.entity_id,
  r.room_type_id,
  r.room_number,
  r.name,
  r.floor,
  r.building,
  r.status,
  r.is_active,
  r.notes,
  r.features,
  r.description,
  r.photos,
  COALESCE(r.base_price, rt.base_price) AS effective_base_price,
  COALESCE(r.base_occupancy, rt.base_occupancy) AS effective_base_occupancy,
  COALESCE(r.max_occupancy, rt.max_occupancy) AS effective_max_occupancy,
  COALESCE(r.max_children, rt.max_children) AS effective_max_children,
  COALESCE(r.size_sqm, rt.size_sqm) AS effective_size_sqm,
  COALESCE(r.bed_configuration, rt.bed_configuration) AS effective_bed_configuration,
  COALESCE(NULLIF(r.amenities, '[]'::jsonb), rt.amenities) AS effective_amenities,
  r.created_at,
  r.updated_at
FROM rooms r
JOIN room_types rt ON rt.id = r.room_type_id;

GRANT SELECT ON v_rooms_effective TO authenticated, anon;
