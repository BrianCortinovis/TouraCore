-- 00066: Restaurant reservations + double-booking prevention trigger
-- Dipende da: restaurants (00064), restaurant_tables (00065), guests, reservations (hospitality)
-- Modulo: Restaurant M021/S01

CREATE TABLE public.restaurant_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  guest_id UUID REFERENCES public.guests(id) ON DELETE SET NULL,
  linked_stay_reservation_id UUID REFERENCES public.reservations(id) ON DELETE SET NULL,
  slot_date DATE NOT NULL,
  slot_time TIME NOT NULL,
  service_label TEXT,
  party_size SMALLINT NOT NULL CHECK (party_size > 0),
  duration_minutes INT NOT NULL DEFAULT 90 CHECK (duration_minutes > 0),
  table_ids UUID[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','confirmed','seated','finished','cancelled','no_show','waitlist')),
  source TEXT NOT NULL DEFAULT 'direct'
    CHECK (source IN ('direct','widget','phone','walk_in','thefork','google','opentable','stay_linked')),
  guest_name TEXT,
  guest_phone TEXT,
  guest_email TEXT,
  special_requests TEXT,
  allergies TEXT[] NOT NULL DEFAULT '{}',
  occasion TEXT,
  deposit_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  deposit_stripe_intent_id TEXT,
  deposit_status TEXT
    CHECK (deposit_status IN ('held','captured','released','failed')),
  meal_plan_credit_applied BOOLEAN NOT NULL DEFAULT FALSE,
  covers_billed_to_folio NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes_staff TEXT,
  assigned_waiter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  seated_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ
);

CREATE INDEX idx_restaurant_reservations_lookup
  ON public.restaurant_reservations(restaurant_id, slot_date, status);
CREATE INDEX idx_restaurant_reservations_stay
  ON public.restaurant_reservations(linked_stay_reservation_id)
  WHERE linked_stay_reservation_id IS NOT NULL;
CREATE INDEX idx_restaurant_reservations_guest
  ON public.restaurant_reservations(guest_id)
  WHERE guest_id IS NOT NULL;

ALTER TABLE public.restaurant_reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "restaurant_reservations_select" ON public.restaurant_reservations
  FOR SELECT USING (
    restaurant_id = ANY(get_user_restaurant_ids())
    OR is_platform_admin()
  );

CREATE POLICY "restaurant_reservations_insert" ON public.restaurant_reservations
  FOR INSERT WITH CHECK (
    restaurant_id = ANY(get_user_restaurant_ids())
    OR is_platform_admin()
  );

CREATE POLICY "restaurant_reservations_update" ON public.restaurant_reservations
  FOR UPDATE USING (
    restaurant_id = ANY(get_user_restaurant_ids())
    OR is_platform_admin()
  );

CREATE POLICY "restaurant_reservations_delete" ON public.restaurant_reservations
  FOR DELETE USING (
    restaurant_id = ANY(get_user_restaurant_ids())
    OR is_platform_admin()
  );

CREATE TRIGGER set_restaurant_reservations_updated_at
  BEFORE UPDATE ON public.restaurant_reservations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- Double-booking prevention: trigger BEFORE INSERT/UPDATE
-- Check overlap su table_ids per stesso restaurant + slot range
-- Active solo se status IN (confirmed, seated)
-- ============================================================================

CREATE OR REPLACE FUNCTION check_restaurant_table_overlap()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  conflict_id UUID;
  new_start TIMESTAMPTZ;
  new_end TIMESTAMPTZ;
BEGIN
  -- Skip check se status non blocca tavolo
  IF NEW.status NOT IN ('confirmed','seated') THEN
    RETURN NEW;
  END IF;

  IF cardinality(NEW.table_ids) = 0 THEN
    RETURN NEW;
  END IF;

  new_start := (NEW.slot_date::TEXT || ' ' || NEW.slot_time::TEXT)::TIMESTAMPTZ;
  new_end := new_start + (NEW.duration_minutes || ' minutes')::INTERVAL;

  SELECT r.id INTO conflict_id
  FROM public.restaurant_reservations r
  WHERE r.restaurant_id = NEW.restaurant_id
    AND r.id <> NEW.id
    AND r.status IN ('confirmed','seated')
    AND r.table_ids && NEW.table_ids  -- array overlap operator
    AND tstzrange(
          (r.slot_date::TEXT || ' ' || r.slot_time::TEXT)::TIMESTAMPTZ,
          (r.slot_date::TEXT || ' ' || r.slot_time::TEXT)::TIMESTAMPTZ
            + (r.duration_minutes || ' minutes')::INTERVAL,
          '[)'
        ) && tstzrange(new_start, new_end, '[)')
  LIMIT 1;

  IF conflict_id IS NOT NULL THEN
    RAISE EXCEPTION 'Table conflict with reservation %', conflict_id
      USING ERRCODE = 'exclusion_violation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_restaurant_reservations_no_overlap
  BEFORE INSERT OR UPDATE OF table_ids, slot_date, slot_time, duration_minutes, status
  ON public.restaurant_reservations
  FOR EACH ROW EXECUTE FUNCTION check_restaurant_table_overlap();
