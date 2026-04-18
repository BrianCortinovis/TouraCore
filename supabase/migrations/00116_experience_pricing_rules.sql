-- 00116: Dynamic pricing rules (season, surge, group discount, last-minute)
-- Modulo: Experience M060

CREATE TABLE public.experience_pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.experience_products(id) ON DELETE CASCADE,
  entity_id UUID REFERENCES public.experience_entities(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('season','surge','group_discount','last_minute','day_of_week','time_of_day','early_bird')),
  priority INT NOT NULL DEFAULT 0,
  conditions JSONB NOT NULL DEFAULT '{}'::jsonb,
  adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('percent','fixed_amount','override')),
  adjustment_value NUMERIC(10,2) NOT NULL,
  valid_from DATE,
  valid_to DATE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (product_id IS NOT NULL OR entity_id IS NOT NULL)
);
CREATE INDEX idx_epr_product ON public.experience_pricing_rules(product_id) WHERE product_id IS NOT NULL;
CREATE INDEX idx_epr_entity ON public.experience_pricing_rules(entity_id) WHERE entity_id IS NOT NULL;
CREATE INDEX idx_epr_tenant ON public.experience_pricing_rules(tenant_id);
CREATE INDEX idx_epr_active ON public.experience_pricing_rules(tenant_id, active, kind) WHERE active = TRUE;

ALTER TABLE public.experience_pricing_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "epr_all" ON public.experience_pricing_rules FOR ALL USING (
  tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin()
) WITH CHECK (tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin());
CREATE TRIGGER set_epr_updated_at BEFORE UPDATE ON public.experience_pricing_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at();
