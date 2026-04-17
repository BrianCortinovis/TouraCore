-- 00067: Restaurant waitlist
-- Dipende da: restaurants (00064), guests
-- Modulo: Restaurant M021/S01

CREATE TABLE public.restaurant_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  guest_id UUID REFERENCES public.guests(id) ON DELETE SET NULL,
  guest_name TEXT,
  phone TEXT,
  party_size SMALLINT NOT NULL CHECK (party_size > 0),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  estimated_wait_min INT,
  notified_at TIMESTAMPTZ,
  seated_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'waiting'
    CHECK (status IN ('waiting','notified','seated','left','abandoned')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_restaurant_waitlist_active
  ON public.restaurant_waitlist(restaurant_id, status, requested_at)
  WHERE status IN ('waiting','notified');

ALTER TABLE public.restaurant_waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "restaurant_waitlist_select" ON public.restaurant_waitlist
  FOR SELECT USING (
    restaurant_id = ANY(get_user_restaurant_ids())
    OR is_platform_admin()
  );

CREATE POLICY "restaurant_waitlist_insert" ON public.restaurant_waitlist
  FOR INSERT WITH CHECK (
    restaurant_id = ANY(get_user_restaurant_ids())
    OR is_platform_admin()
  );

CREATE POLICY "restaurant_waitlist_update" ON public.restaurant_waitlist
  FOR UPDATE USING (
    restaurant_id = ANY(get_user_restaurant_ids())
    OR is_platform_admin()
  );

CREATE POLICY "restaurant_waitlist_delete" ON public.restaurant_waitlist
  FOR DELETE USING (
    restaurant_id = ANY(get_user_restaurant_ids())
    OR is_platform_admin()
  );

CREATE TRIGGER set_restaurant_waitlist_updated_at
  BEFORE UPDATE ON public.restaurant_waitlist
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
