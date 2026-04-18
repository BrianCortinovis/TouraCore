-- 00111: Experience addons (upsell: foto, gopro, casco premium, assicurazione, pickup)
-- Modulo: Experience M061

CREATE TABLE public.experience_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.experience_products(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  kind TEXT NOT NULL CHECK (kind IN ('gear','media','insurance','transport','food','other')),
  price_cents INT NOT NULL DEFAULT 0 CHECK (price_cents >= 0),
  price_per TEXT NOT NULL DEFAULT 'booking' CHECK (price_per IN ('booking','guest','hour','unit')),
  required BOOLEAN NOT NULL DEFAULT FALSE,
  max_qty INT CHECK (max_qty IS NULL OR max_qty > 0),
  stock INT,
  display_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (product_id, code)
);
CREATE INDEX idx_experience_addons_product ON public.experience_addons(product_id);
CREATE INDEX idx_experience_addons_tenant ON public.experience_addons(tenant_id);

ALTER TABLE public.experience_addons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "experience_addons_all" ON public.experience_addons FOR ALL USING (
  tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin() OR EXISTS (
    SELECT 1 FROM public.agency_tenant_links atl WHERE atl.tenant_id = experience_addons.tenant_id AND atl.agency_id = ANY(get_user_agency_ids()) AND atl.status = 'active'
  )
) WITH CHECK (tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin());
CREATE TRIGGER set_experience_addons_updated_at BEFORE UPDATE ON public.experience_addons FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE public.experience_pickup_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES public.experience_entities(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  radius_km NUMERIC(6,2),
  surcharge_cents INT NOT NULL DEFAULT 0 CHECK (surcharge_cents >= 0),
  geom JSONB,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_ep_zones_entity ON public.experience_pickup_zones(entity_id);
CREATE INDEX idx_ep_zones_tenant ON public.experience_pickup_zones(tenant_id);

ALTER TABLE public.experience_pickup_zones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ep_zones_all" ON public.experience_pickup_zones FOR ALL USING (
  tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin()
) WITH CHECK (tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin());
CREATE TRIGGER set_ep_zones_updated_at BEFORE UPDATE ON public.experience_pickup_zones FOR EACH ROW EXECUTE FUNCTION update_updated_at();
