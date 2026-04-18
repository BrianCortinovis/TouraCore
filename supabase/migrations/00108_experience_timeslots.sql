-- 00108: Experience timeslots (slot generati da schedule con capacity)
-- Dipende da: 00105_experience_products, 00107_experience_schedules
-- Modulo: Experience M051/S01

CREATE TABLE public.experience_timeslots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.experience_products(id) ON DELETE CASCADE,
  schedule_id UUID REFERENCES public.experience_schedules(id) ON DELETE SET NULL,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  capacity_total INT NOT NULL CHECK (capacity_total > 0),
  capacity_booked INT NOT NULL DEFAULT 0 CHECK (capacity_booked >= 0),
  capacity_held INT NOT NULL DEFAULT 0 CHECK (capacity_held >= 0),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','full','blocked','cancelled')),
  price_override_cents INT CHECK (price_override_cents IS NULL OR price_override_cents >= 0),
  resource_assignment JSONB NOT NULL DEFAULT '{}'::jsonb,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (product_id, start_at),
  CHECK (end_at > start_at),
  CHECK (capacity_booked + capacity_held <= capacity_total)
);

CREATE INDEX idx_experience_timeslots_product ON public.experience_timeslots(product_id, start_at);
CREATE INDEX idx_experience_timeslots_tenant ON public.experience_timeslots(tenant_id);
CREATE INDEX idx_experience_timeslots_status ON public.experience_timeslots(product_id, status) WHERE status = 'open';
CREATE INDEX idx_experience_timeslots_upcoming ON public.experience_timeslots(status, start_at) WHERE status = 'open';

ALTER TABLE public.experience_timeslots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "experience_timeslots_select" ON public.experience_timeslots
  FOR SELECT USING (
    tenant_id = ANY(get_user_tenant_ids())
    OR is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM public.agency_tenant_links atl
      WHERE atl.tenant_id = experience_timeslots.tenant_id
        AND atl.agency_id = ANY(get_user_agency_ids())
        AND atl.status = 'active'
    )
  );

CREATE POLICY "experience_timeslots_insert" ON public.experience_timeslots
  FOR INSERT WITH CHECK (
    tenant_id = ANY(get_user_tenant_ids())
    OR is_platform_admin()
  );

CREATE POLICY "experience_timeslots_update" ON public.experience_timeslots
  FOR UPDATE USING (
    tenant_id = ANY(get_user_tenant_ids())
    OR is_platform_admin()
  );

CREATE POLICY "experience_timeslots_delete" ON public.experience_timeslots
  FOR DELETE USING (
    tenant_id = ANY(get_user_tenant_ids())
    OR is_platform_admin()
  );

CREATE TRIGGER set_experience_timeslots_updated_at
  BEFORE UPDATE ON public.experience_timeslots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Atomic decrement con SELECT FOR UPDATE SKIP LOCKED pattern wrapper
CREATE OR REPLACE FUNCTION experience_timeslot_try_book(
  p_timeslot_id UUID,
  p_seats INT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total INT;
  v_booked INT;
  v_held INT;
  v_status TEXT;
BEGIN
  SELECT capacity_total, capacity_booked, capacity_held, status
    INTO v_total, v_booked, v_held, v_status
    FROM public.experience_timeslots
    WHERE id = p_timeslot_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  IF v_status != 'open' THEN
    RETURN FALSE;
  END IF;

  IF v_booked + v_held + p_seats > v_total THEN
    RETURN FALSE;
  END IF;

  UPDATE public.experience_timeslots
    SET capacity_booked = capacity_booked + p_seats,
        status = CASE WHEN capacity_booked + p_seats + capacity_held >= capacity_total THEN 'full' ELSE status END,
        updated_at = NOW()
    WHERE id = p_timeslot_id;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION experience_timeslot_try_book(UUID, INT) TO authenticated;

COMMENT ON TABLE public.experience_timeslots IS 'Slot generati da schedule. capacity_total + capacity_booked + capacity_held gestiti con atomic lock.';
COMMENT ON FUNCTION experience_timeslot_try_book IS 'Atomic booking con SELECT FOR UPDATE. Returns TRUE if booked, FALSE if no capacity.';
