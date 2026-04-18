-- 00112: Custom fields (form builder JSON schema) + Waivers digital
-- Modulo: Experience M056

CREATE TABLE public.experience_custom_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.experience_products(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK (field_type IN ('text','number','date','select','multiselect','checkbox','email','phone','height_cm','weight_kg','shoe_size','clothing_size','language','age')),
  required BOOLEAN NOT NULL DEFAULT FALSE,
  per_guest BOOLEAN NOT NULL DEFAULT FALSE,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  validation JSONB NOT NULL DEFAULT '{}'::jsonb,
  placeholder TEXT,
  help_text TEXT,
  display_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (product_id, code)
);
CREATE INDEX idx_ecf_product ON public.experience_custom_fields(product_id);
CREATE INDEX idx_ecf_tenant ON public.experience_custom_fields(tenant_id);

ALTER TABLE public.experience_custom_fields ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ecf_all" ON public.experience_custom_fields FOR ALL USING (
  tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin()
) WITH CHECK (tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin());
CREATE TRIGGER set_ecf_updated_at BEFORE UPDATE ON public.experience_custom_fields FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE public.experience_waivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES public.experience_entities(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body_md TEXT NOT NULL,
  version INT NOT NULL DEFAULT 1 CHECK (version > 0),
  language TEXT NOT NULL DEFAULT 'it',
  requires_adult_signature BOOLEAN NOT NULL DEFAULT TRUE,
  requires_parent_for_minor BOOLEAN NOT NULL DEFAULT TRUE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (entity_id, version, language)
);
CREATE INDEX idx_ew_entity ON public.experience_waivers(entity_id);
CREATE INDEX idx_ew_tenant ON public.experience_waivers(tenant_id);

ALTER TABLE public.experience_waivers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ew_all" ON public.experience_waivers FOR ALL USING (
  tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin()
) WITH CHECK (tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin());
CREATE TRIGGER set_ew_updated_at BEFORE UPDATE ON public.experience_waivers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
