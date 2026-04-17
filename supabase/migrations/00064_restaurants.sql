-- 00064: Restaurants entity extension
-- Dipende da: entities (00028), tenants (00002)
-- Modulo: Restaurant M021/S01

CREATE TABLE public.restaurants (
  id UUID PRIMARY KEY REFERENCES public.entities(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  cuisine_type TEXT[] NOT NULL DEFAULT '{}',
  price_range SMALLINT CHECK (price_range BETWEEN 1 AND 4),
  capacity_total INT NOT NULL DEFAULT 0 CHECK (capacity_total >= 0),
  avg_turn_minutes INT NOT NULL DEFAULT 90 CHECK (avg_turn_minutes > 0),
  parent_entity_id UUID REFERENCES public.entities(id) ON DELETE SET NULL,
  opening_hours JSONB NOT NULL DEFAULT '{}'::jsonb,
  services JSONB NOT NULL DEFAULT '[]'::jsonb,
  reservation_mode TEXT NOT NULL DEFAULT 'slot'
    CHECK (reservation_mode IN ('slot','rolling','hybrid')),
  deposit_policy JSONB NOT NULL DEFAULT '{}'::jsonb,
  no_show_policy JSONB NOT NULL DEFAULT '{}'::jsonb,
  tax_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_restaurants_tenant ON public.restaurants(tenant_id);
CREATE INDEX idx_restaurants_parent ON public.restaurants(parent_entity_id) WHERE parent_entity_id IS NOT NULL;

ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "restaurants_select" ON public.restaurants
  FOR SELECT USING (
    tenant_id = ANY(get_user_tenant_ids())
    OR is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM public.agency_tenant_links atl
      WHERE atl.tenant_id = restaurants.tenant_id
        AND atl.agency_id = ANY(get_user_agency_ids())
        AND atl.status = 'active'
    )
  );

CREATE POLICY "restaurants_insert" ON public.restaurants
  FOR INSERT WITH CHECK (
    tenant_id = ANY(get_user_tenant_ids())
    OR is_platform_admin()
  );

CREATE POLICY "restaurants_update" ON public.restaurants
  FOR UPDATE USING (
    tenant_id = ANY(get_user_tenant_ids())
    OR is_platform_admin()
  );

CREATE POLICY "restaurants_delete" ON public.restaurants
  FOR DELETE USING (
    tenant_id = ANY(get_user_tenant_ids())
    OR is_platform_admin()
  );

CREATE TRIGGER set_restaurants_updated_at
  BEFORE UPDATE ON public.restaurants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Helper SECURITY DEFINER per RLS chain (rooms/tables/reservations)
CREATE OR REPLACE FUNCTION get_user_restaurant_ids()
RETURNS UUID[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN COALESCE(
    (SELECT array_agg(id)
     FROM public.restaurants
     WHERE tenant_id = ANY(get_user_tenant_ids())),
    ARRAY[]::UUID[]
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_restaurant_ids() TO authenticated, anon;
