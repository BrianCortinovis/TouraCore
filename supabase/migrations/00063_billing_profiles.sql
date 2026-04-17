-- 00063: Billing profiles (subscription/commission/hybrid/free) — 3 scope
-- Dipende da: tenants, agencies, module_catalog (00058), commission_ledger (00021)
-- Fase F1 — foundation multi-module

CREATE TABLE public.billing_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope TEXT NOT NULL CHECK (scope IN ('tenant','agency','global_default')),
  scope_id UUID,
  module_code TEXT REFERENCES public.module_catalog(code),
  billing_model TEXT NOT NULL CHECK (billing_model IN ('subscription','commission','hybrid','free')),
  subscription_price_eur NUMERIC(10,2),
  subscription_interval TEXT CHECK (subscription_interval IN ('month','year')) DEFAULT 'month',
  commission_percent NUMERIC(5,2) CHECK (commission_percent IS NULL OR (commission_percent >= 0 AND commission_percent <= 100)),
  commission_fixed_eur NUMERIC(10,2) DEFAULT 0,
  commission_applies_to TEXT[] DEFAULT ARRAY['booking_total']::TEXT[]
    CHECK (commission_applies_to <@ ARRAY['booking_total','booking_net','coperto','rental','upsell']::TEXT[]),
  commission_min_eur NUMERIC(10,2),
  commission_cap_eur NUMERIC(10,2),
  platform_commission_percent NUMERIC(5,2),
  agency_commission_percent NUMERIC(5,2),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  created_by_user_id UUID REFERENCES auth.users(id),
  created_by_scope TEXT CHECK (created_by_scope IN ('super_admin','agency','system')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (
    (scope = 'global_default' AND scope_id IS NULL)
    OR (scope IN ('tenant','agency') AND scope_id IS NOT NULL)
  )
);

CREATE INDEX idx_billing_profiles_scope ON public.billing_profiles(scope, scope_id, module_code) WHERE active = TRUE;
CREATE INDEX idx_billing_profiles_validity ON public.billing_profiles(valid_until) WHERE active = TRUE AND valid_until IS NOT NULL;

ALTER TABLE public.billing_profiles ENABLE ROW LEVEL SECURITY;

-- Super-admin full access
CREATE POLICY "billing_profiles_super_admin" ON public.billing_profiles
  FOR ALL USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- Agency: read/write su propri profili (scope=agency con scope_id=propria agency)
-- + read su tenant sotto agency
CREATE POLICY "billing_profiles_agency_select" ON public.billing_profiles
  FOR SELECT USING (
    (scope = 'agency' AND scope_id = ANY(get_user_agency_ids()))
    OR (scope = 'tenant' AND EXISTS (
      SELECT 1 FROM public.agency_tenant_links atl
      WHERE atl.tenant_id = billing_profiles.scope_id
        AND atl.agency_id = ANY(get_user_agency_ids())
        AND atl.status = 'active'
    ))
    OR scope = 'global_default'
  );

CREATE POLICY "billing_profiles_agency_write" ON public.billing_profiles
  FOR INSERT WITH CHECK (
    created_by_scope = 'agency'
    AND (
      (scope = 'agency' AND scope_id = ANY(get_user_agency_ids()))
      OR (scope = 'tenant' AND EXISTS (
        SELECT 1 FROM public.agency_tenant_links atl
        WHERE atl.tenant_id = billing_profiles.scope_id
          AND atl.agency_id = ANY(get_user_agency_ids())
          AND atl.status = 'active'
      ))
    )
  );

-- Tenant owner read-only su billing_profile che lo riguarda
CREATE POLICY "billing_profiles_tenant_read" ON public.billing_profiles
  FOR SELECT USING (
    scope = 'tenant' AND scope_id = ANY(get_user_tenant_ids())
  );

CREATE TRIGGER set_billing_profiles_updated_at
  BEFORE UPDATE ON public.billing_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- Default globali per ogni modulo (subscription model)
-- ============================================================================

INSERT INTO public.billing_profiles (scope, scope_id, module_code, billing_model, subscription_price_eur, created_by_scope, notes) VALUES
 ('global_default', NULL, 'hospitality', 'subscription', 29, 'system', 'default globale'),
 ('global_default', NULL, 'restaurant', 'subscription', 29, 'system', 'default globale'),
 ('global_default', NULL, 'wellness', 'subscription', 19, 'system', 'default globale'),
 ('global_default', NULL, 'experiences', 'subscription', 19, 'system', 'default globale'),
 ('global_default', NULL, 'bike_rental', 'subscription', 15, 'system', 'default globale'),
 ('global_default', NULL, 'moto_rental', 'subscription', 19, 'system', 'default globale'),
 ('global_default', NULL, 'ski_school', 'subscription', 15, 'system', 'default globale');

-- ============================================================================
-- EXTEND commission_ledger: link a billing_profile + dettagli applicazione
-- ============================================================================

ALTER TABLE public.commission_ledger
  ADD COLUMN IF NOT EXISTS billing_profile_id UUID REFERENCES public.billing_profiles(id),
  ADD COLUMN IF NOT EXISTS module_code TEXT REFERENCES public.module_catalog(code),
  ADD COLUMN IF NOT EXISTS commission_percent_applied NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS base_amount_eur NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS applies_to TEXT,
  ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES public.agencies(id),
  ADD COLUMN IF NOT EXISTS platform_amount_eur NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS agency_amount_eur NUMERIC(10,2);

CREATE INDEX IF NOT EXISTS idx_commission_ledger_module ON public.commission_ledger(module_code);
CREATE INDEX IF NOT EXISTS idx_commission_ledger_agency ON public.commission_ledger(agency_id) WHERE agency_id IS NOT NULL;

-- ============================================================================
-- Helper: resolve_billing_profile(tenant_id, module_code) → billing_profile
-- Resolution priority:
--   1. tenant + module_code
--   2. tenant + NULL module_code (tenant-wide override)
--   3. agency + module_code (se tenant sotto agency attiva)
--   4. agency + NULL module_code
--   5. global_default + module_code
-- ============================================================================

CREATE OR REPLACE FUNCTION public.resolve_billing_profile(p_tenant UUID, p_module TEXT)
RETURNS SETOF public.billing_profiles
LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_agency_id UUID;
BEGIN
  -- 1. tenant + module
  RETURN QUERY
    SELECT * FROM public.billing_profiles
    WHERE scope = 'tenant' AND scope_id = p_tenant AND module_code = p_module
      AND active = TRUE AND (valid_until IS NULL OR valid_until > NOW())
    ORDER BY created_at DESC LIMIT 1;
  IF FOUND THEN RETURN; END IF;

  -- 2. tenant + any module
  RETURN QUERY
    SELECT * FROM public.billing_profiles
    WHERE scope = 'tenant' AND scope_id = p_tenant AND module_code IS NULL
      AND active = TRUE AND (valid_until IS NULL OR valid_until > NOW())
    ORDER BY created_at DESC LIMIT 1;
  IF FOUND THEN RETURN; END IF;

  -- Trova agency attiva per tenant
  SELECT atl.agency_id INTO v_agency_id
    FROM public.agency_tenant_links atl
   WHERE atl.tenant_id = p_tenant AND atl.status = 'active'
   LIMIT 1;

  IF v_agency_id IS NOT NULL THEN
    -- 3. agency + module
    RETURN QUERY
      SELECT * FROM public.billing_profiles
      WHERE scope = 'agency' AND scope_id = v_agency_id AND module_code = p_module
        AND active = TRUE AND (valid_until IS NULL OR valid_until > NOW())
      ORDER BY created_at DESC LIMIT 1;
    IF FOUND THEN RETURN; END IF;

    -- 4. agency + any module
    RETURN QUERY
      SELECT * FROM public.billing_profiles
      WHERE scope = 'agency' AND scope_id = v_agency_id AND module_code IS NULL
        AND active = TRUE AND (valid_until IS NULL OR valid_until > NOW())
      ORDER BY created_at DESC LIMIT 1;
    IF FOUND THEN RETURN; END IF;
  END IF;

  -- 5. global_default + module
  RETURN QUERY
    SELECT * FROM public.billing_profiles
    WHERE scope = 'global_default' AND module_code = p_module
      AND active = TRUE AND (valid_until IS NULL OR valid_until > NOW())
    ORDER BY created_at DESC LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_billing_profile(UUID, TEXT) TO authenticated, service_role;

-- ============================================================================
-- Helper: get_effective_module_price(tenant_id, module_code) → NUMERIC
-- Considera: free override > billing_profile > fallback module_catalog.base_price
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_effective_module_price(p_tenant UUID, p_module TEXT)
RETURNS NUMERIC
LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_profile public.billing_profiles%ROWTYPE;
  v_base NUMERIC;
BEGIN
  -- Free override schiaccia tutto
  IF public.has_active_free_override(p_tenant, p_module) THEN
    RETURN 0;
  END IF;

  -- Resolve profile
  SELECT * INTO v_profile FROM public.resolve_billing_profile(p_tenant, p_module) LIMIT 1;

  IF FOUND THEN
    IF v_profile.billing_model = 'free' THEN
      RETURN 0;
    ELSIF v_profile.billing_model IN ('subscription','hybrid') THEN
      RETURN COALESCE(v_profile.subscription_price_eur, 0);
    ELSIF v_profile.billing_model = 'commission' THEN
      RETURN 0; -- commission-only: zero fisso mensile
    END IF;
  END IF;

  -- Fallback
  SELECT base_price_eur INTO v_base FROM public.module_catalog WHERE code = p_module;
  RETURN COALESCE(v_base, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_effective_module_price(UUID, TEXT) TO authenticated, service_role;
