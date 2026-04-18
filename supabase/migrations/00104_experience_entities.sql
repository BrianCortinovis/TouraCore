-- 00104: Experience entity extension (motoslitte, parco avventura, escape room, tour, noleggio bob/kayak)
-- Dipende da: entities (00028), tenants (00002), update_updated_at trigger, get_user_tenant_ids, agency_tenant_links
-- Modulo: Experience M051/S01

-- =============================================================================
-- 1. experience_entities — entity extension (1:1 con entities WHERE kind='activity')
-- =============================================================================
CREATE TABLE public.experience_entities (
  id UUID PRIMARY KEY REFERENCES public.entities(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN (
    'snow_sport','water_sport','adventure_park','escape_room','guided_tour',
    'tasting','karting','laser_tag','rental_gear','workshop','wellness_experience','other'
  )),
  address TEXT,
  city TEXT,
  zip TEXT,
  country TEXT NOT NULL DEFAULT 'IT',
  latitude NUMERIC(9,6),
  longitude NUMERIC(9,6),
  opening_hours JSONB NOT NULL DEFAULT '{}'::jsonb,
  languages TEXT[] NOT NULL DEFAULT ARRAY['it'],
  age_min_default INT CHECK (age_min_default IS NULL OR age_min_default >= 0),
  age_max_default INT CHECK (age_max_default IS NULL OR age_max_default <= 120),
  height_min_cm_default INT CHECK (height_min_cm_default IS NULL OR height_min_cm_default >= 0),
  difficulty_default TEXT CHECK (difficulty_default IS NULL OR difficulty_default IN ('easy','medium','hard','extreme')),
  cancellation_policy JSONB NOT NULL DEFAULT '{}'::jsonb,
  waiver_policy JSONB NOT NULL DEFAULT '{}'::jsonb,
  deposit_policy JSONB NOT NULL DEFAULT '{}'::jsonb,
  pickup_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_experience_entities_tenant ON public.experience_entities(tenant_id);
CREATE INDEX idx_experience_entities_category ON public.experience_entities(category);
CREATE INDEX idx_experience_entities_city ON public.experience_entities(city) WHERE city IS NOT NULL;

ALTER TABLE public.experience_entities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "experience_entities_select" ON public.experience_entities
  FOR SELECT USING (
    tenant_id = ANY(get_user_tenant_ids())
    OR is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM public.agency_tenant_links atl
      WHERE atl.tenant_id = experience_entities.tenant_id
        AND atl.agency_id = ANY(get_user_agency_ids())
        AND atl.status = 'active'
    )
  );

CREATE POLICY "experience_entities_insert" ON public.experience_entities
  FOR INSERT WITH CHECK (
    tenant_id = ANY(get_user_tenant_ids())
    OR is_platform_admin()
  );

CREATE POLICY "experience_entities_update" ON public.experience_entities
  FOR UPDATE USING (
    tenant_id = ANY(get_user_tenant_ids())
    OR is_platform_admin()
  );

CREATE POLICY "experience_entities_delete" ON public.experience_entities
  FOR DELETE USING (
    tenant_id = ANY(get_user_tenant_ids())
    OR is_platform_admin()
  );

CREATE TRIGGER set_experience_entities_updated_at
  BEFORE UPDATE ON public.experience_entities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Helper SECURITY DEFINER per RLS chain (products/timeslots/reservations)
CREATE OR REPLACE FUNCTION get_user_experience_entity_ids()
RETURNS UUID[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN COALESCE(
    (SELECT array_agg(id)
     FROM public.experience_entities
     WHERE tenant_id = ANY(get_user_tenant_ids())),
    ARRAY[]::UUID[]
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_experience_entity_ids() TO authenticated, anon;

COMMENT ON TABLE public.experience_entities IS 'Entity extension for experience vertical (1:1 with entities where kind=activity)';
