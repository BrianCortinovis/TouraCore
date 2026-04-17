-- 00083: Restaurant pricing rules + suggestions (replicate hospitality pattern via core engine)

CREATE TABLE IF NOT EXISTS public.restaurant_pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  rule_type TEXT NOT NULL CHECK (rule_type IN (
    'occupancy_based','lead_time','day_of_week','season','event','last_minute','early_bird','time_of_day','group_size'
  )),
  name TEXT NOT NULL,
  applies_to TEXT NOT NULL DEFAULT 'cover' CHECK (applies_to IN ('cover','table','item','any')),
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('percent','fixed')),
  adjustment_value NUMERIC(10,2) NOT NULL,
  priority INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  applies_to_table_ids UUID[] DEFAULT '{}',
  applies_to_menu_item_ids UUID[] DEFAULT '{}',
  valid_from DATE,
  valid_to DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_restaurant_pricing_rules_active ON public.restaurant_pricing_rules(restaurant_id) WHERE active = TRUE;

CREATE TABLE IF NOT EXISTS public.restaurant_pricing_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  applies_to TEXT NOT NULL,  -- 'cover','table','item'
  resource_id UUID,  -- table_id o menu_item_id
  service_date DATE NOT NULL,
  time_slot TIME,
  current_price NUMERIC(10,2),
  suggested_price NUMERIC(10,2) NOT NULL,
  confidence_pct SMALLINT,
  reason TEXT,
  applied BOOLEAN NOT NULL DEFAULT FALSE,
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (restaurant_id, applies_to, resource_id, service_date, time_slot)
);

CREATE INDEX IF NOT EXISTS idx_restaurant_pricing_suggestions_date ON public.restaurant_pricing_suggestions(restaurant_id, service_date);

ALTER TABLE public.restaurant_pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_pricing_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "restaurant_pricing_rules_all" ON public.restaurant_pricing_rules
  FOR ALL USING (restaurant_id = ANY(get_user_restaurant_ids()) OR is_platform_admin())
  WITH CHECK (restaurant_id = ANY(get_user_restaurant_ids()) OR is_platform_admin());

CREATE POLICY "restaurant_pricing_suggestions_all" ON public.restaurant_pricing_suggestions
  FOR ALL USING (restaurant_id = ANY(get_user_restaurant_ids()) OR is_platform_admin())
  WITH CHECK (restaurant_id = ANY(get_user_restaurant_ids()) OR is_platform_admin());

DROP TRIGGER IF EXISTS set_restaurant_pricing_rules_updated_at ON public.restaurant_pricing_rules;
CREATE TRIGGER set_restaurant_pricing_rules_updated_at BEFORE UPDATE ON public.restaurant_pricing_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
