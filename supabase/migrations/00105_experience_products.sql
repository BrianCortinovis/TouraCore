-- 00105: Experience products (SKU prodotto con 3 booking mode)
-- Dipende da: 00104_experience_entities
-- Modulo: Experience M051/S01

CREATE TABLE public.experience_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES public.experience_entities(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description_md TEXT,
  booking_mode TEXT NOT NULL CHECK (booking_mode IN ('timeslot_capacity','timeslot_private','asset_rental')),
  duration_minutes INT NOT NULL CHECK (duration_minutes > 0),
  -- capacity_default richiesto solo per timeslot_capacity e asset_rental
  capacity_default INT CHECK (capacity_default IS NULL OR capacity_default > 0),
  age_min INT CHECK (age_min IS NULL OR age_min >= 0),
  age_max INT CHECK (age_max IS NULL OR age_max <= 120),
  height_min_cm INT CHECK (height_min_cm IS NULL OR height_min_cm >= 0),
  difficulty TEXT CHECK (difficulty IS NULL OR difficulty IN ('easy','medium','hard','extreme')),
  languages TEXT[] NOT NULL DEFAULT ARRAY['it'],
  price_base_cents INT NOT NULL DEFAULT 0 CHECK (price_base_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'EUR',
  vat_rate NUMERIC(5,2) NOT NULL DEFAULT 22.00 CHECK (vat_rate >= 0 AND vat_rate <= 100),
  images TEXT[] NOT NULL DEFAULT '{}',
  highlights TEXT[] NOT NULL DEFAULT '{}',
  includes TEXT[] NOT NULL DEFAULT '{}',
  excludes TEXT[] NOT NULL DEFAULT '{}',
  requirements TEXT,
  meeting_point TEXT,
  waiver_required BOOLEAN NOT NULL DEFAULT FALSE,
  deposit_required_cents INT NOT NULL DEFAULT 0 CHECK (deposit_required_cents >= 0),
  cutoff_minutes INT NOT NULL DEFAULT 0 CHECK (cutoff_minutes >= 0),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','archived')),
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (entity_id, slug),
  CHECK (
    (booking_mode = 'timeslot_private') OR (capacity_default IS NOT NULL)
  )
);

CREATE INDEX idx_experience_products_entity ON public.experience_products(entity_id);
CREATE INDEX idx_experience_products_tenant ON public.experience_products(tenant_id);
CREATE INDEX idx_experience_products_mode ON public.experience_products(booking_mode);
CREATE INDEX idx_experience_products_status ON public.experience_products(tenant_id, status) WHERE status = 'active';

ALTER TABLE public.experience_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "experience_products_select" ON public.experience_products
  FOR SELECT USING (
    tenant_id = ANY(get_user_tenant_ids())
    OR is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM public.agency_tenant_links atl
      WHERE atl.tenant_id = experience_products.tenant_id
        AND atl.agency_id = ANY(get_user_agency_ids())
        AND atl.status = 'active'
    )
  );

CREATE POLICY "experience_products_insert" ON public.experience_products
  FOR INSERT WITH CHECK (
    tenant_id = ANY(get_user_tenant_ids())
    OR is_platform_admin()
  );

CREATE POLICY "experience_products_update" ON public.experience_products
  FOR UPDATE USING (
    tenant_id = ANY(get_user_tenant_ids())
    OR is_platform_admin()
  );

CREATE POLICY "experience_products_delete" ON public.experience_products
  FOR DELETE USING (
    tenant_id = ANY(get_user_tenant_ids())
    OR is_platform_admin()
  );

CREATE TRIGGER set_experience_products_updated_at
  BEFORE UPDATE ON public.experience_products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

COMMENT ON TABLE public.experience_products IS 'SKU prodotti experience con 3 booking_mode (timeslot_capacity/private/asset_rental)';
