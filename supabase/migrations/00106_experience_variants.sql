-- 00106: Experience product variants (adulto/bambino/famiglia/private/group)
-- Dipende da: 00105_experience_products
-- Modulo: Experience M051/S01

CREATE TABLE public.experience_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.experience_products(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('adult','child','infant','senior','family','group','private','student','resident','other')),
  price_cents INT NOT NULL DEFAULT 0 CHECK (price_cents >= 0),
  price_diff_cents INT NOT NULL DEFAULT 0,
  min_qty INT NOT NULL DEFAULT 0 CHECK (min_qty >= 0),
  max_qty INT CHECK (max_qty IS NULL OR max_qty > 0),
  age_min INT CHECK (age_min IS NULL OR age_min >= 0),
  age_max INT CHECK (age_max IS NULL OR age_max <= 120),
  includes_capacity INT NOT NULL DEFAULT 1 CHECK (includes_capacity > 0),
  display_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (product_id, code)
);

CREATE INDEX idx_experience_variants_product ON public.experience_variants(product_id);
CREATE INDEX idx_experience_variants_tenant ON public.experience_variants(tenant_id);
CREATE INDEX idx_experience_variants_active ON public.experience_variants(product_id, active) WHERE active = TRUE;

ALTER TABLE public.experience_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "experience_variants_select" ON public.experience_variants
  FOR SELECT USING (
    tenant_id = ANY(get_user_tenant_ids())
    OR is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM public.agency_tenant_links atl
      WHERE atl.tenant_id = experience_variants.tenant_id
        AND atl.agency_id = ANY(get_user_agency_ids())
        AND atl.status = 'active'
    )
  );

CREATE POLICY "experience_variants_insert" ON public.experience_variants
  FOR INSERT WITH CHECK (
    tenant_id = ANY(get_user_tenant_ids())
    OR is_platform_admin()
  );

CREATE POLICY "experience_variants_update" ON public.experience_variants
  FOR UPDATE USING (
    tenant_id = ANY(get_user_tenant_ids())
    OR is_platform_admin()
  );

CREATE POLICY "experience_variants_delete" ON public.experience_variants
  FOR DELETE USING (
    tenant_id = ANY(get_user_tenant_ids())
    OR is_platform_admin()
  );

CREATE TRIGGER set_experience_variants_updated_at
  BEFORE UPDATE ON public.experience_variants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

COMMENT ON TABLE public.experience_variants IS 'Varianti prezzo per experience_products (adulto/bambino/famiglia/private/group)';
