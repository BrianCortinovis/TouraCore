-- 00097: Bike rental pricing catalog — bike_types + addons + pricing_rules
-- Dipende da: 00093 (bike_rentals)
-- Modulo: Bike Rental M040/S01

-- =============================================================================
-- bike_types — catalog dei tipi bike con tariffe base per entity
-- =============================================================================
CREATE TABLE public.bike_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bike_rental_id UUID NOT NULL REFERENCES public.bike_rentals(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  type_key TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  photo TEXT,
  hourly_rate NUMERIC(10,2) CHECK (hourly_rate IS NULL OR hourly_rate >= 0),
  half_day_rate NUMERIC(10,2) CHECK (half_day_rate IS NULL OR half_day_rate >= 0),
  daily_rate NUMERIC(10,2) CHECK (daily_rate IS NULL OR daily_rate >= 0),
  weekly_rate NUMERIC(10,2) CHECK (weekly_rate IS NULL OR weekly_rate >= 0),
  deposit_amount NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (deposit_amount >= 0),
  age_min INT CHECK (age_min IS NULL OR age_min >= 0),
  age_max INT CHECK (age_max IS NULL OR age_max <= 120),
  height_min INT CHECK (height_min IS NULL OR height_min BETWEEN 80 AND 250),
  height_max INT CHECK (height_max IS NULL OR height_max BETWEEN 80 AND 250),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (bike_rental_id, type_key)
);

CREATE INDEX idx_bike_types_rental ON public.bike_types(bike_rental_id);
CREATE INDEX idx_bike_types_tenant ON public.bike_types(tenant_id);
CREATE INDEX idx_bike_types_active ON public.bike_types(bike_rental_id, active) WHERE active = TRUE;

ALTER TABLE public.bike_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bike_types_select" ON public.bike_types FOR SELECT USING (
  tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin()
  OR EXISTS (SELECT 1 FROM public.agency_tenant_links atl WHERE atl.tenant_id = bike_types.tenant_id AND atl.agency_id = ANY(get_user_agency_ids()) AND atl.status='active')
);
CREATE POLICY "bike_types_insert" ON public.bike_types FOR INSERT WITH CHECK (tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin());
CREATE POLICY "bike_types_update" ON public.bike_types FOR UPDATE USING (tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin());
CREATE POLICY "bike_types_delete" ON public.bike_types FOR DELETE USING (tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin());

CREATE TRIGGER set_bike_types_updated_at BEFORE UPDATE ON public.bike_types FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- bike_rental_addons — catalog add-ons per entity
-- =============================================================================
CREATE TABLE public.bike_rental_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bike_rental_id UUID NOT NULL REFERENCES public.bike_rentals(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  addon_key TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  category TEXT CHECK (category IS NULL OR category IN ('safety','comfort','navigation','insurance','transport')),
  pricing_mode TEXT NOT NULL DEFAULT 'per_rental' CHECK (pricing_mode IN ('per_rental','per_day','per_hour','per_bike','percent_of_total')),
  unit_price NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  mandatory_for TEXT[] NOT NULL DEFAULT '{}',
  stock_total INT CHECK (stock_total IS NULL OR stock_total >= 0),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (bike_rental_id, addon_key)
);

CREATE INDEX idx_bike_addons_rental ON public.bike_rental_addons(bike_rental_id);
CREATE INDEX idx_bike_addons_tenant ON public.bike_rental_addons(tenant_id);

ALTER TABLE public.bike_rental_addons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bike_addons_select" ON public.bike_rental_addons FOR SELECT USING (
  tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin()
  OR EXISTS (SELECT 1 FROM public.agency_tenant_links atl WHERE atl.tenant_id = bike_rental_addons.tenant_id AND atl.agency_id = ANY(get_user_agency_ids()) AND atl.status='active')
);
CREATE POLICY "bike_addons_insert" ON public.bike_rental_addons FOR INSERT WITH CHECK (tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin());
CREATE POLICY "bike_addons_update" ON public.bike_rental_addons FOR UPDATE USING (tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin());
CREATE POLICY "bike_addons_delete" ON public.bike_rental_addons FOR DELETE USING (tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin());

CREATE TRIGGER set_bike_addons_updated_at BEFORE UPDATE ON public.bike_rental_addons FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- bike_rental_pricing_rules — rules engine (seasonal/peak/surge/duration/group)
-- =============================================================================
CREATE TABLE public.bike_rental_pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bike_rental_id UUID NOT NULL REFERENCES public.bike_rentals(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  rule_name TEXT NOT NULL,
  rule_type TEXT NOT NULL CHECK (rule_type IN (
    'season','day_of_week','time_of_day','duration_tier','group_size',
    'surge','early_bird','last_minute','one_way_fee','delivery_fee','event','occupancy_based'
  )),
  applies_to TEXT[] NOT NULL DEFAULT '{}',
  config JSONB NOT NULL DEFAULT '{}',
  adjustment_type TEXT NOT NULL DEFAULT 'percent' CHECK (adjustment_type IN ('percent','fixed')),
  adjustment_value NUMERIC(10,2) NOT NULL DEFAULT 0,
  priority INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  valid_from DATE,
  valid_to DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bike_pricing_rules_rental ON public.bike_rental_pricing_rules(bike_rental_id);
CREATE INDEX idx_bike_pricing_rules_tenant ON public.bike_rental_pricing_rules(tenant_id);
CREATE INDEX idx_bike_pricing_rules_active ON public.bike_rental_pricing_rules(bike_rental_id, active, priority DESC) WHERE active = TRUE;

ALTER TABLE public.bike_rental_pricing_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bike_pricing_rules_select" ON public.bike_rental_pricing_rules FOR SELECT USING (
  tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin()
  OR EXISTS (SELECT 1 FROM public.agency_tenant_links atl WHERE atl.tenant_id = bike_rental_pricing_rules.tenant_id AND atl.agency_id = ANY(get_user_agency_ids()) AND atl.status='active')
);
CREATE POLICY "bike_pricing_rules_insert" ON public.bike_rental_pricing_rules FOR INSERT WITH CHECK (tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin());
CREATE POLICY "bike_pricing_rules_update" ON public.bike_rental_pricing_rules FOR UPDATE USING (tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin());
CREATE POLICY "bike_pricing_rules_delete" ON public.bike_rental_pricing_rules FOR DELETE USING (tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin());

CREATE TRIGGER set_bike_pricing_rules_updated_at BEFORE UPDATE ON public.bike_rental_pricing_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at();

COMMENT ON TABLE public.bike_types IS 'Catalog bike types con tariffe base per entity (hourly/half_day/daily/weekly)';
COMMENT ON TABLE public.bike_rental_addons IS 'Catalog add-ons (helmet, lock, insurance, etc) con pricing mode';
COMMENT ON TABLE public.bike_rental_pricing_rules IS 'Rules engine: seasonal/peak/surge/duration/group_size/one_way_fee/delivery_fee';
