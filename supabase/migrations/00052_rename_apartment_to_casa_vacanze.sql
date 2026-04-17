-- 00052: Rename property_type 'apartment' -> 'casa_vacanze'
-- 'apartment' era ambiguo (può confondersi con rooms.category='apartment').
-- 'casa_vacanze' descrive struttura; gli appartamenti dentro restano in rooms.
-- Tenant isolation invariata (non tocca RLS).

-- ============================================================================
-- 1. DROP check constraint esistenti che referenziano 'apartment' come property_type
-- ============================================================================

ALTER TABLE accommodations DROP CONSTRAINT IF EXISTS accommodations_property_type_check;

-- ============================================================================
-- 2. UPDATE data
-- ============================================================================

UPDATE accommodations
SET property_type = 'casa_vacanze'
WHERE property_type = 'apartment';

-- ============================================================================
-- 3. RECREATE check constraints con nuovo valore
-- ============================================================================

ALTER TABLE accommodations
  ADD CONSTRAINT accommodations_property_type_check
  CHECK (property_type IN ('hotel', 'residence', 'mixed', 'b_and_b', 'agriturismo', 'casa_vacanze', 'affittacamere'));

-- ============================================================================
-- 4. UPDATE function ensure_default_room_type (00051) con nuovo valore
-- ============================================================================

CREATE OR REPLACE FUNCTION ensure_default_room_type(p_entity_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_id UUID;
  v_new_id UUID;
  v_property_type TEXT;
  v_category TEXT;
  v_name TEXT;
BEGIN
  SELECT property_type INTO v_property_type
  FROM accommodations
  WHERE entity_id = p_entity_id;

  IF v_property_type IS NULL THEN
    RETURN NULL;
  END IF;

  IF v_property_type NOT IN ('casa_vacanze', 'b_and_b', 'agriturismo', 'affittacamere') THEN
    RETURN NULL;
  END IF;

  SELECT id INTO v_existing_id
  FROM room_types
  WHERE entity_id = p_entity_id
    AND code = '__default__'
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    RETURN v_existing_id;
  END IF;

  v_category := CASE v_property_type
    WHEN 'casa_vacanze' THEN 'apartment'
    WHEN 'b_and_b' THEN 'room'
    WHEN 'agriturismo' THEN 'room'
    WHEN 'affittacamere' THEN 'room'
    ELSE 'room'
  END;

  v_name := CASE v_property_type
    WHEN 'casa_vacanze' THEN 'Appartamento'
    ELSE 'Camera'
  END;

  INSERT INTO room_types (
    entity_id, name, code, category,
    base_occupancy, max_occupancy, max_children,
    base_price, sort_order, is_active
  ) VALUES (
    p_entity_id, v_name, '__default__', v_category,
    2, 4, 0,
    0, 0, true
  )
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$;

-- ============================================================================
-- 5. UPDATE trigger function con nuovo valore
-- ============================================================================

CREATE OR REPLACE FUNCTION trg_ensure_default_room_type()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.property_type IN ('casa_vacanze', 'b_and_b', 'agriturismo', 'affittacamere') THEN
    PERFORM ensure_default_room_type(NEW.entity_id);
  END IF;
  RETURN NEW;
END;
$$;

-- ============================================================================
-- 6. GRANTS (idempotent)
-- ============================================================================

GRANT EXECUTE ON FUNCTION ensure_default_room_type(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_default_room_type_id(UUID) TO authenticated, anon;
