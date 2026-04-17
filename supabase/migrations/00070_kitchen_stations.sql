-- 00070: Kitchen stations + printer queue
-- Modulo: Restaurant M024

CREATE TABLE public.kitchen_stations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  printer_ip TEXT,
  printer_port INT DEFAULT 9100,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (restaurant_id, code)
);

CREATE INDEX idx_kitchen_stations_restaurant ON public.kitchen_stations(restaurant_id) WHERE active = TRUE;

ALTER TABLE public.kitchen_stations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kitchen_stations_all" ON public.kitchen_stations
  FOR ALL USING (restaurant_id = ANY(get_user_restaurant_ids()) OR is_platform_admin())
  WITH CHECK (restaurant_id = ANY(get_user_restaurant_ids()) OR is_platform_admin());

CREATE TRIGGER set_kitchen_stations_updated_at
  BEFORE UPDATE ON public.kitchen_stations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- print_jobs queue ESC/POS
-- ============================================================================

CREATE TABLE public.print_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID NOT NULL REFERENCES public.kitchen_stations(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.restaurant_orders(id) ON DELETE SET NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','printing','done','failed')),
  attempts SMALLINT NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_print_jobs_pending ON public.print_jobs(station_id, status)
  WHERE status IN ('pending', 'failed');

ALTER TABLE public.print_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "print_jobs_all" ON public.print_jobs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.kitchen_stations s
            WHERE s.id = print_jobs.station_id
              AND (s.restaurant_id = ANY(get_user_restaurant_ids()) OR is_platform_admin()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.kitchen_stations s
            WHERE s.id = print_jobs.station_id
              AND (s.restaurant_id = ANY(get_user_restaurant_ids()) OR is_platform_admin()))
  );

CREATE TRIGGER set_print_jobs_updated_at
  BEFORE UPDATE ON public.print_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
