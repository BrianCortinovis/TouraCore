-- 00093: Bike Rental entity extension + multi-depot locations
-- Dipende da: entities (00028), tenants (00002), update_updated_at trigger, get_user_tenant_ids, agency_tenant_links
-- Modulo: Bike Rental M038/S01

-- =============================================================================
-- 1. bike_rentals — entity extension (1:1 con entities WHERE kind='bike_rental')
-- =============================================================================
CREATE TABLE public.bike_rentals (
  id UUID PRIMARY KEY REFERENCES public.entities(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  bike_types TEXT[] NOT NULL DEFAULT '{}',
  capacity_total INT NOT NULL DEFAULT 0 CHECK (capacity_total >= 0),
  avg_rental_hours INT NOT NULL DEFAULT 4 CHECK (avg_rental_hours > 0),
  parent_entity_id UUID REFERENCES public.entities(id) ON DELETE SET NULL,
  address TEXT,
  city TEXT,
  zip TEXT,
  country TEXT NOT NULL DEFAULT 'IT',
  latitude NUMERIC(9,6),
  longitude NUMERIC(9,6),
  opening_hours JSONB NOT NULL DEFAULT '{}'::jsonb,
  buffer_minutes INT NOT NULL DEFAULT 15 CHECK (buffer_minutes >= 0),
  deposit_policy JSONB NOT NULL DEFAULT '{}'::jsonb,
  cancellation_policy JSONB NOT NULL DEFAULT '{}'::jsonb,
  late_fee_policy JSONB NOT NULL DEFAULT '{}'::jsonb,
  insurance_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  rental_agreement_md TEXT,
  agreement_version INT NOT NULL DEFAULT 1 CHECK (agreement_version > 0),
  delivery_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  one_way_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bike_rentals_tenant ON public.bike_rentals(tenant_id);
CREATE INDEX idx_bike_rentals_parent ON public.bike_rentals(parent_entity_id) WHERE parent_entity_id IS NOT NULL;
CREATE INDEX idx_bike_rentals_city ON public.bike_rentals(city) WHERE city IS NOT NULL;

ALTER TABLE public.bike_rentals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bike_rentals_select" ON public.bike_rentals
  FOR SELECT USING (
    tenant_id = ANY(get_user_tenant_ids())
    OR is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM public.agency_tenant_links atl
      WHERE atl.tenant_id = bike_rentals.tenant_id
        AND atl.agency_id = ANY(get_user_agency_ids())
        AND atl.status = 'active'
    )
  );

CREATE POLICY "bike_rentals_insert" ON public.bike_rentals
  FOR INSERT WITH CHECK (
    tenant_id = ANY(get_user_tenant_ids())
    OR is_platform_admin()
  );

CREATE POLICY "bike_rentals_update" ON public.bike_rentals
  FOR UPDATE USING (
    tenant_id = ANY(get_user_tenant_ids())
    OR is_platform_admin()
  );

CREATE POLICY "bike_rentals_delete" ON public.bike_rentals
  FOR DELETE USING (
    tenant_id = ANY(get_user_tenant_ids())
    OR is_platform_admin()
  );

CREATE TRIGGER set_bike_rentals_updated_at
  BEFORE UPDATE ON public.bike_rentals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Helper SECURITY DEFINER per RLS chain (bikes/locations/reservations)
CREATE OR REPLACE FUNCTION get_user_bike_rental_ids()
RETURNS UUID[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN COALESCE(
    (SELECT array_agg(id)
     FROM public.bike_rentals
     WHERE tenant_id = ANY(get_user_tenant_ids())),
    ARRAY[]::UUID[]
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_bike_rental_ids() TO authenticated, anon;

-- =============================================================================
-- 2. bike_locations — multi-depot (pickup/return points)
-- =============================================================================
CREATE TABLE public.bike_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bike_rental_id UUID NOT NULL REFERENCES public.bike_rentals(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  zip TEXT,
  country TEXT NOT NULL DEFAULT 'IT',
  latitude NUMERIC(9,6),
  longitude NUMERIC(9,6),
  opening_hours JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_pickup BOOLEAN NOT NULL DEFAULT TRUE,
  is_return BOOLEAN NOT NULL DEFAULT TRUE,
  capacity INT CHECK (capacity IS NULL OR capacity >= 0),
  display_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bike_locations_rental ON public.bike_locations(bike_rental_id);
CREATE INDEX idx_bike_locations_tenant ON public.bike_locations(tenant_id);
CREATE INDEX idx_bike_locations_active ON public.bike_locations(bike_rental_id, active) WHERE active = TRUE;

ALTER TABLE public.bike_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bike_locations_select" ON public.bike_locations
  FOR SELECT USING (
    tenant_id = ANY(get_user_tenant_ids())
    OR is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM public.agency_tenant_links atl
      WHERE atl.tenant_id = bike_locations.tenant_id
        AND atl.agency_id = ANY(get_user_agency_ids())
        AND atl.status = 'active'
    )
  );

CREATE POLICY "bike_locations_insert" ON public.bike_locations
  FOR INSERT WITH CHECK (
    tenant_id = ANY(get_user_tenant_ids())
    OR is_platform_admin()
  );

CREATE POLICY "bike_locations_update" ON public.bike_locations
  FOR UPDATE USING (
    tenant_id = ANY(get_user_tenant_ids())
    OR is_platform_admin()
  );

CREATE POLICY "bike_locations_delete" ON public.bike_locations
  FOR DELETE USING (
    tenant_id = ANY(get_user_tenant_ids())
    OR is_platform_admin()
  );

CREATE TRIGGER set_bike_locations_updated_at
  BEFORE UPDATE ON public.bike_locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

COMMENT ON TABLE public.bike_rentals IS 'Entity extension for bike_rental vertical (1:1 with entities where kind=bike_rental)';
COMMENT ON TABLE public.bike_locations IS 'Multi-depot pickup/return points for a bike rental entity';
