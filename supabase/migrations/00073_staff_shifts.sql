-- 00073: Restaurant staff + shifts + clock entries + tip pool
-- Modulo: Restaurant M027

CREATE TABLE public.restaurant_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN (
    'chef','sous_chef','line_cook','pastry_chef','dishwasher',
    'maitre','waiter','runner','sommelier','barman','host'
  )),
  pin_code TEXT,
  hourly_rate NUMERIC(10,2),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (restaurant_id, pin_code)
);

CREATE INDEX idx_restaurant_staff_restaurant ON public.restaurant_staff(restaurant_id) WHERE active = TRUE;

CREATE TABLE public.staff_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES public.restaurant_staff(id) ON DELETE CASCADE,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  role TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned','active','completed','cancelled','no_show')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_at > start_at)
);

CREATE INDEX idx_staff_shifts_lookup ON public.staff_shifts(restaurant_id, start_at);

CREATE TABLE public.time_clock_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES public.restaurant_staff(id) ON DELETE CASCADE,
  shift_id UUID REFERENCES public.staff_shifts(id) ON DELETE SET NULL,
  clock_in TIMESTAMPTZ NOT NULL,
  clock_out TIMESTAMPTZ,
  source TEXT NOT NULL DEFAULT 'pin'
    CHECK (source IN ('pin','manual','mobile','admin')),
  break_minutes INT NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_time_clock_staff ON public.time_clock_entries(staff_id, clock_in DESC);

CREATE TABLE public.tip_pools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  rule_type TEXT NOT NULL DEFAULT 'egalitarian'
    CHECK (rule_type IN ('egalitarian','weighted_role','seniority')),
  rule_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','distributed','paid')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.tip_distributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id UUID NOT NULL REFERENCES public.tip_pools(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES public.restaurant_staff(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  hours_worked NUMERIC(6,2),
  weight NUMERIC(4,2),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tip_distributions_pool ON public.tip_distributions(pool_id);

ALTER TABLE public.restaurant_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_clock_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tip_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tip_distributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "restaurant_staff_all" ON public.restaurant_staff
  FOR ALL USING (restaurant_id = ANY(get_user_restaurant_ids()) OR is_platform_admin())
  WITH CHECK (restaurant_id = ANY(get_user_restaurant_ids()) OR is_platform_admin());

CREATE POLICY "staff_shifts_all" ON public.staff_shifts
  FOR ALL USING (restaurant_id = ANY(get_user_restaurant_ids()) OR is_platform_admin())
  WITH CHECK (restaurant_id = ANY(get_user_restaurant_ids()) OR is_platform_admin());

CREATE POLICY "time_clock_entries_all" ON public.time_clock_entries
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.restaurant_staff s WHERE s.id = time_clock_entries.staff_id
            AND (s.restaurant_id = ANY(get_user_restaurant_ids()) OR is_platform_admin()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.restaurant_staff s WHERE s.id = time_clock_entries.staff_id
            AND (s.restaurant_id = ANY(get_user_restaurant_ids()) OR is_platform_admin()))
  );

CREATE POLICY "tip_pools_all" ON public.tip_pools
  FOR ALL USING (restaurant_id = ANY(get_user_restaurant_ids()) OR is_platform_admin())
  WITH CHECK (restaurant_id = ANY(get_user_restaurant_ids()) OR is_platform_admin());

CREATE POLICY "tip_distributions_all" ON public.tip_distributions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.tip_pools p WHERE p.id = tip_distributions.pool_id
            AND (p.restaurant_id = ANY(get_user_restaurant_ids()) OR is_platform_admin()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.tip_pools p WHERE p.id = tip_distributions.pool_id
            AND (p.restaurant_id = ANY(get_user_restaurant_ids()) OR is_platform_admin()))
  );

CREATE TRIGGER set_restaurant_staff_updated_at BEFORE UPDATE ON public.restaurant_staff
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_staff_shifts_updated_at BEFORE UPDATE ON public.staff_shifts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_tip_pools_updated_at BEFORE UPDATE ON public.tip_pools
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
