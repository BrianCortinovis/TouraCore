-- 00060: Module overrides (free/discount/extended_trial) — super_admin + agency
-- Dipende da: tenants, module_catalog (00058), agencies (00012), platform_admins (00030/00032)
-- Fase F1 — foundation multi-module

CREATE TABLE public.module_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  module_code TEXT NOT NULL REFERENCES public.module_catalog(code),
  override_type TEXT NOT NULL CHECK (override_type IN ('free','discount_percent','discount_flat','extended_trial')),
  override_value NUMERIC(10,2),
  reason TEXT NOT NULL,
  granted_by_user_id UUID REFERENCES auth.users(id),
  granted_by_scope TEXT NOT NULL CHECK (granted_by_scope IN ('super_admin','agency')),
  granted_by_agency_id UUID REFERENCES public.agencies(id),
  valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  revoked_at TIMESTAMPTZ,
  revoked_by_user_id UUID REFERENCES auth.users(id),
  revoked_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_module_overrides_lookup ON public.module_overrides(tenant_id, module_code) WHERE active = TRUE;
CREATE INDEX idx_module_overrides_agency ON public.module_overrides(granted_by_agency_id) WHERE granted_by_scope = 'agency';
CREATE INDEX idx_module_overrides_validity ON public.module_overrides(valid_until) WHERE active = TRUE AND valid_until IS NOT NULL;

ALTER TABLE public.module_overrides ENABLE ROW LEVEL SECURITY;

-- Super-admin full access
CREATE POLICY "module_overrides_super_admin" ON public.module_overrides
  FOR ALL USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- Tenant owner read-only su override propri
CREATE POLICY "module_overrides_tenant_read" ON public.module_overrides
  FOR SELECT USING (tenant_id = ANY(get_user_tenant_ids()));

-- Agency scope: full access solo su tenant sotto agency con link attivo + can_grant_free
-- Esplicito: agency_members role 'owner' o 'agency_admin' possono granted
CREATE POLICY "module_overrides_agency_select" ON public.module_overrides
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.agency_tenant_links atl
      WHERE atl.tenant_id = module_overrides.tenant_id
        AND atl.agency_id = ANY(get_user_agency_ids())
        AND atl.status = 'active'
    )
  );

CREATE POLICY "module_overrides_agency_insert" ON public.module_overrides
  FOR INSERT WITH CHECK (
    granted_by_scope = 'agency'
    AND granted_by_agency_id = ANY(get_user_agency_ids())
    AND EXISTS (
      SELECT 1 FROM public.agency_tenant_links atl
      WHERE atl.tenant_id = module_overrides.tenant_id
        AND atl.agency_id = module_overrides.granted_by_agency_id
        AND atl.status = 'active'
    )
  );

CREATE POLICY "module_overrides_agency_update" ON public.module_overrides
  FOR UPDATE USING (
    granted_by_scope = 'agency'
    AND granted_by_agency_id = ANY(get_user_agency_ids())
  );

CREATE TRIGGER set_module_overrides_updated_at
  BEFORE UPDATE ON public.module_overrides
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- Helper: has_active_override(tenant_id, module_code) → boolean
-- ============================================================================

CREATE OR REPLACE FUNCTION public.has_active_free_override(p_tenant UUID, p_module TEXT)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.module_overrides
    WHERE tenant_id = p_tenant
      AND module_code = p_module
      AND override_type = 'free'
      AND active = TRUE
      AND (valid_until IS NULL OR valid_until > NOW())
  );
$$;

GRANT EXECUTE ON FUNCTION public.has_active_free_override(UUID, TEXT) TO authenticated, service_role;
