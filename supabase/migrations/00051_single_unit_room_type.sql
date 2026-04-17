-- 00051: Single-unit room_type auto-management
-- Per property_type IN (apartment, b_and_b, agriturismo, affittacamere):
-- auto-crea 1 default room_type ("Unità principale") e lo mantiene.
-- UI CMS nasconde gestione tipologie per questi tipi. Backend invariato.
-- Tenant isolation: tutte operazioni scoped via accommodations.entity_id → entities.tenant_id → RLS.

-- ============================================================================
-- 1. FUNCTION: ensure_default_room_type
-- ============================================================================
-- Crea room_type default per entity se non esiste. Idempotente.
-- Chiamata da trigger e backfill.

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
  -- Property type
  SELECT property_type INTO v_property_type
  FROM accommodations
  WHERE entity_id = p_entity_id;

  IF v_property_type IS NULL THEN
    RETURN NULL;
  END IF;

  -- Only single-unit types
  IF v_property_type NOT IN ('apartment', 'b_and_b', 'agriturismo', 'affittacamere') THEN
    RETURN NULL;
  END IF;

  -- Existing default?
  SELECT id INTO v_existing_id
  FROM room_types
  WHERE entity_id = p_entity_id
    AND code = '__default__'
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    RETURN v_existing_id;
  END IF;

  -- Category per tipo
  v_category := CASE v_property_type
    WHEN 'apartment' THEN 'apartment'
    WHEN 'b_and_b' THEN 'room'
    WHEN 'agriturismo' THEN 'room'
    WHEN 'affittacamere' THEN 'room'
    ELSE 'room'
  END;

  v_name := CASE v_property_type
    WHEN 'apartment' THEN 'Appartamento'
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
-- 2. TRIGGER: auto-create on accommodation insert/update
-- ============================================================================

CREATE OR REPLACE FUNCTION trg_ensure_default_room_type()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.property_type IN ('apartment', 'b_and_b', 'agriturismo', 'affittacamere') THEN
    PERFORM ensure_default_room_type(NEW.entity_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS accommodations_ensure_default_room_type ON accommodations;

CREATE TRIGGER accommodations_ensure_default_room_type
  AFTER INSERT OR UPDATE OF property_type ON accommodations
  FOR EACH ROW
  EXECUTE FUNCTION trg_ensure_default_room_type();

-- ============================================================================
-- 3. BACKFILL: default room_type per entity esistenti senza room_types
-- ============================================================================

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT a.entity_id
    FROM accommodations a
    WHERE a.property_type IN ('apartment', 'b_and_b', 'agriturismo', 'affittacamere')
      AND NOT EXISTS (
        SELECT 1 FROM room_types rt WHERE rt.entity_id = a.entity_id
      )
  LOOP
    PERFORM ensure_default_room_type(r.entity_id);
  END LOOP;
END $$;

-- ============================================================================
-- 4. HELPER: resolve default room_type per entity (per API/booking-engine)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_default_room_type_id(p_entity_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM room_types
  WHERE entity_id = p_entity_id
    AND code = '__default__'
    AND is_active = true
  LIMIT 1;
$$;

-- ============================================================================
-- 5. GRANTS
-- ============================================================================

GRANT EXECUTE ON FUNCTION ensure_default_room_type(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_default_room_type_id(UUID) TO authenticated, anon;
