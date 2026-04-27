-- 00152: Atomic booking gates (P0 #5 — overbooking protection)
-- Provides advisory-lock + recheck RPCs per verticals that did check-then-insert.
-- Caller pattern: BEGIN tx → SELECT gate_rpc(...) → INSERT row → COMMIT.
-- Since Supabase JS lacks multi-statement tx, the RPCs perform the lock + recheck
-- inside a single statement; the lock is released at end of the implicit tx.
-- For full atomicity callers SHOULD use SECURITY DEFINER RPC that owns insert too;
-- for now the gates are pessimistic recheck barriers under serialized lock per scope.

-- Lock namespace constants (arbitrary unique ints)
-- 8001 = hospitality entity-room-type window
-- 8002 = bike rental window per (rental_id, type)
-- 8003 = restaurant table walk-in slot

-- ================================================================
-- HOSPITALITY: lock per (entity_id, room_type_id, date window)
-- ================================================================
CREATE OR REPLACE FUNCTION hospitality_room_check_availability(
  p_entity_id UUID,
  p_room_type_id UUID,
  p_check_in DATE,
  p_check_out DATE
)
RETURNS TABLE (available_rooms INT, total_rooms INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lock_key BIGINT;
BEGIN
  -- Advisory lock per (entity, room_type) — serialize all bookings for the same scope.
  v_lock_key := ('x' || substr(md5('8001:' || p_entity_id::text || ':' || p_room_type_id::text), 1, 15))::bit(60)::bigint;
  PERFORM pg_advisory_xact_lock(v_lock_key);

  RETURN QUERY
  WITH
    rooms_in_type AS (
      SELECT id FROM public.rooms
      WHERE entity_id = p_entity_id
        AND room_type_id = p_room_type_id
        AND is_active = true
        AND status IN ('available','cleaning')
    ),
    blocked AS (
      SELECT DISTINCT room_id FROM public.room_blocks
      WHERE entity_id = p_entity_id
        AND date_from < p_check_out
        AND date_to > p_check_in
    ),
    reserved_rooms AS (
      SELECT DISTINCT room_id FROM public.reservations
      WHERE entity_id = p_entity_id
        AND status IN ('confirmed','checked_in')
        AND room_id IS NOT NULL
        AND check_in < p_check_out
        AND check_out > p_check_in
    ),
    reserved_by_type AS (
      SELECT count(*)::int AS cnt FROM public.reservations
      WHERE entity_id = p_entity_id
        AND room_type_id = p_room_type_id
        AND status IN ('confirmed','checked_in')
        AND room_id IS NULL
        AND check_in < p_check_out
        AND check_out > p_check_in
    ),
    free AS (
      SELECT id FROM rooms_in_type
      WHERE id NOT IN (SELECT room_id FROM blocked WHERE room_id IS NOT NULL)
        AND id NOT IN (SELECT room_id FROM reserved_rooms WHERE room_id IS NOT NULL)
    )
  SELECT
    GREATEST(0, (SELECT count(*)::int FROM free) - (SELECT cnt FROM reserved_by_type)) AS available_rooms,
    (SELECT count(*)::int FROM rooms_in_type) AS total_rooms;
END;
$$;

-- ================================================================
-- BIKE RENTAL: lock per (bike_rental_id, bike_type, window)
-- ================================================================
CREATE OR REPLACE FUNCTION bike_rental_check_availability(
  p_bike_rental_id UUID,
  p_bike_type TEXT,
  p_rental_start TIMESTAMPTZ,
  p_rental_end TIMESTAMPTZ,
  p_quantity INT
)
RETURNS TABLE (available_count INT, has_capacity BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lock_key BIGINT;
  v_total INT;
  v_booked INT;
BEGIN
  v_lock_key := ('x' || substr(md5('8002:' || p_bike_rental_id::text || ':' || p_bike_type), 1, 15))::bit(60)::bigint;
  PERFORM pg_advisory_xact_lock(v_lock_key);

  SELECT count(*)::int INTO v_total
  FROM public.bikes
  WHERE bike_rental_id = p_bike_rental_id
    AND bike_type = p_bike_type
    AND is_active = true
    AND status IN ('available','maintenance');

  SELECT COALESCE(count(*)::int, 0) INTO v_booked
  FROM public.bike_rental_reservation_items i
  JOIN public.bike_rental_reservations r ON r.id = i.reservation_id
  WHERE r.bike_rental_id = p_bike_rental_id
    AND i.bike_type = p_bike_type
    AND r.status NOT IN ('cancelled','completed','no_show')
    AND r.rental_start < p_rental_end
    AND r.rental_end > p_rental_start;

  available_count := GREATEST(0, v_total - v_booked);
  has_capacity := available_count >= p_quantity;
  RETURN NEXT;
END;
$$;

-- ================================================================
-- RESTAURANT: lock per (restaurant_id, slot window) — walk-in serialization
-- ================================================================
CREATE OR REPLACE FUNCTION restaurant_table_acquire_lock(
  p_restaurant_id UUID,
  p_slot_start TIMESTAMPTZ
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lock_key BIGINT;
BEGIN
  v_lock_key := ('x' || substr(md5('8003:' || p_restaurant_id::text || ':' || date_trunc('hour', p_slot_start)::text), 1, 15))::bit(60)::bigint;
  PERFORM pg_advisory_xact_lock(v_lock_key);
  RETURN true;
END;
$$;

-- Grants: callable from authenticated + service_role + anon (public booking)
GRANT EXECUTE ON FUNCTION hospitality_room_check_availability(UUID, UUID, DATE, DATE) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION bike_rental_check_availability(UUID, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, INT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION restaurant_table_acquire_lock(UUID, TIMESTAMPTZ) TO anon, authenticated, service_role;

COMMENT ON FUNCTION hospitality_room_check_availability IS 'P0 #5 overbooking gate: advisory-lock + recheck disponibilità camere prima dell''insert reservation.';
COMMENT ON FUNCTION bike_rental_check_availability IS 'P0 #5 overbooking gate: advisory-lock + recheck disponibilità bike prima dell''insert reservation.';
COMMENT ON FUNCTION restaurant_table_acquire_lock IS 'P0 #5 race gate: advisory-lock per slot orario walk-in (auto-assign tables).';

-- ================================================================
-- P0 #6 / P1: Webhook dedup race fix — UNIQUE constraint per atomic insert.
-- ================================================================
-- Drop duplicates if any (defensive, prima di constraint)
WITH dups AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY provider, external_event_id ORDER BY processed_at NULLS LAST) AS rn
  FROM public.webhook_events
)
DELETE FROM public.webhook_events WHERE id IN (SELECT id FROM dups WHERE rn > 1);

CREATE UNIQUE INDEX IF NOT EXISTS uq_webhook_events_provider_event
  ON public.webhook_events(provider, external_event_id);
COMMENT ON INDEX uq_webhook_events_provider_event IS 'P1: rende atomico il dedup webhook (insert ON CONFLICT DO NOTHING).';
