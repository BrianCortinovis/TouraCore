-- 00114: Channel manager OTA mapping + cross-vertical public views
-- Modulo: Experience M059 + M058

CREATE TABLE public.experience_channel_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES public.experience_entities(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  channel_code TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  api_credentials JSONB NOT NULL DEFAULT '{}'::jsonb,
  commission_pct NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (commission_pct >= 0 AND commission_pct <= 100),
  markup_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  auto_sync BOOLEAN NOT NULL DEFAULT FALSE,
  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (entity_id, channel_code)
);
CREATE INDEX idx_ecc_entity ON public.experience_channel_configs(entity_id);
CREATE INDEX idx_ecc_tenant ON public.experience_channel_configs(tenant_id);

ALTER TABLE public.experience_channel_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ecc_all" ON public.experience_channel_configs FOR ALL USING (
  tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin()
) WITH CHECK (tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin());
CREATE TRIGGER set_ecc_updated_at BEFORE UPDATE ON public.experience_channel_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE public.experience_channel_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID NOT NULL REFERENCES public.experience_channel_configs(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.experience_products(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  external_status TEXT,
  last_push_at TIMESTAMPTZ,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (config_id, product_id)
);
CREATE INDEX idx_ecm_config ON public.experience_channel_mappings(config_id);
CREATE INDEX idx_ecm_product ON public.experience_channel_mappings(product_id);

ALTER TABLE public.experience_channel_mappings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ecm_all" ON public.experience_channel_mappings FOR ALL USING (
  tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin()
) WITH CHECK (tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin());
CREATE TRIGGER set_ecm_updated_at BEFORE UPDATE ON public.experience_channel_mappings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
