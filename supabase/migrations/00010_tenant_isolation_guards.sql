-- 00010: Tenant isolation guardrails
-- Dipende da: properties (00007), room_types (00007), rooms (00007), rate_plans (00008), rate_prices (00008)
-- Pattern adattato da Gest 00023 per lo schema property_id-based di TouraCore

-- ============================================================================
-- COMPOSITE UNIQUE INDEXES — supporto per controlli di consistenza cross-tenant
-- ============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_room_types_id_property_unique
  ON room_types(id, property_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_rooms_id_property_unique
  ON rooms(id, property_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_rate_plans_id_property_unique
  ON rate_plans(id, property_id);

-- ============================================================================
-- TRIGGER: rooms.room_type_id deve appartenere alla stessa property_id
-- ============================================================================

CREATE OR REPLACE FUNCTION enforce_room_property_consistency()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  related_property UUID;
BEGIN
  SELECT property_id INTO related_property
  FROM room_types
  WHERE id = NEW.room_type_id;

  IF related_property IS NULL OR related_property <> NEW.property_id THEN
    RAISE EXCEPTION 'Room type % does not belong to property %', NEW.room_type_id, NEW.property_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_rooms_enforce_property_consistency
BEFORE INSERT OR UPDATE OF property_id, room_type_id
ON rooms
FOR EACH ROW
EXECUTE FUNCTION enforce_room_property_consistency();

-- ============================================================================
-- TRIGGER: rate_prices.room_type_id e rate_plan_id devono condividere la stessa property
-- ============================================================================

CREATE OR REPLACE FUNCTION enforce_rate_price_consistency()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  plan_property UUID;
  type_property UUID;
BEGIN
  SELECT property_id INTO plan_property
  FROM rate_plans
  WHERE id = NEW.rate_plan_id;

  IF plan_property IS NULL THEN
    RAISE EXCEPTION 'Rate plan % does not exist', NEW.rate_plan_id;
  END IF;

  SELECT property_id INTO type_property
  FROM room_types
  WHERE id = NEW.room_type_id;

  IF type_property IS NULL THEN
    RAISE EXCEPTION 'Room type % does not exist', NEW.room_type_id;
  END IF;

  IF plan_property <> type_property THEN
    RAISE EXCEPTION 'Rate plan % (property %) and room type % (property %) belong to different properties',
      NEW.rate_plan_id, plan_property, NEW.room_type_id, type_property;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_rate_prices_enforce_property_consistency
BEFORE INSERT OR UPDATE OF rate_plan_id, room_type_id
ON rate_prices
FOR EACH ROW
EXECUTE FUNCTION enforce_rate_price_consistency();
