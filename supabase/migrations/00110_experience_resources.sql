-- 00110: Experience resources (guide/mezzi/attrezzatura) + M:N assignment
-- Modulo: Experience M054

CREATE TABLE public.experience_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES public.experience_entities(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('guide','vehicle','equipment','location')),
  name TEXT NOT NULL,
  code TEXT,
  capacity INT NOT NULL DEFAULT 1 CHECK (capacity > 0),
  skills TEXT[] NOT NULL DEFAULT '{}',
  languages TEXT[] NOT NULL DEFAULT '{}',
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_experience_resources_entity ON public.experience_resources(entity_id);
CREATE INDEX idx_experience_resources_tenant ON public.experience_resources(tenant_id);
CREATE INDEX idx_experience_resources_kind ON public.experience_resources(entity_id, kind);

ALTER TABLE public.experience_resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "experience_resources_all" ON public.experience_resources FOR ALL USING (
  tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin() OR EXISTS (
    SELECT 1 FROM public.agency_tenant_links atl WHERE atl.tenant_id = experience_resources.tenant_id AND atl.agency_id = ANY(get_user_agency_ids()) AND atl.status = 'active'
  )
) WITH CHECK (tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin());
CREATE TRIGGER set_experience_resources_updated_at BEFORE UPDATE ON public.experience_resources FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE public.experience_resource_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.experience_products(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES public.experience_resources(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  required BOOLEAN NOT NULL DEFAULT TRUE,
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (product_id, resource_id)
);
CREATE INDEX idx_era_product ON public.experience_resource_assignments(product_id);
CREATE INDEX idx_era_resource ON public.experience_resource_assignments(resource_id);

ALTER TABLE public.experience_resource_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "era_all" ON public.experience_resource_assignments FOR ALL USING (
  tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin()
) WITH CHECK (tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin());

CREATE TABLE public.experience_resource_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timeslot_id UUID NOT NULL REFERENCES public.experience_timeslots(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES public.experience_resources(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_at > start_at),
  UNIQUE (timeslot_id, resource_id)
);
CREATE INDEX idx_erb_resource_time ON public.experience_resource_bookings(resource_id, start_at, end_at);
CREATE INDEX idx_erb_tenant ON public.experience_resource_bookings(tenant_id);

ALTER TABLE public.experience_resource_bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "erb_all" ON public.experience_resource_bookings FOR ALL USING (
  tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin()
) WITH CHECK (tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin());

-- Conflict detection: overlap resource allocation
CREATE OR REPLACE FUNCTION experience_resource_has_conflict(
  p_resource_id UUID, p_start TIMESTAMPTZ, p_end TIMESTAMPTZ, p_exclude_timeslot UUID DEFAULT NULL
) RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.experience_resource_bookings
    WHERE resource_id = p_resource_id
      AND (p_exclude_timeslot IS NULL OR timeslot_id != p_exclude_timeslot)
      AND start_at < p_end AND end_at > p_start
  );
$$;
GRANT EXECUTE ON FUNCTION experience_resource_has_conflict TO authenticated;
