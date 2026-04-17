-- 00061: Agency extension — modules, plan, white-label, free grant quota, Stripe
-- Dipende da: agencies (00012), module_catalog (00058)
-- Fase F1 — foundation multi-module

-- ============================================================================
-- 1. AGENCIES — aggiunte colonne per billing + moduli + white-label
-- ============================================================================

ALTER TABLE public.agencies
  ADD COLUMN IF NOT EXISTS modules JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'agency_starter'
    CHECK (plan IN ('agency_starter','agency_pro','agency_enterprise','custom')),
  ADD COLUMN IF NOT EXISTS max_tenants INT,
  ADD COLUMN IF NOT EXISTS white_label_domain TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS branding JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS can_grant_free BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS free_grant_quota INT DEFAULT 5,
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_connect_account_id TEXT;

-- ============================================================================
-- 2. AGENCY_SUBSCRIPTION_ITEMS — agency paga per moduli che può rivendere
-- ============================================================================

CREATE TABLE public.agency_subscription_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  module_code TEXT NOT NULL REFERENCES public.module_catalog(code),
  stripe_subscription_item_id TEXT,
  tenant_slots INT NOT NULL DEFAULT 1,
  used_slots INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('trialing','active','paused','past_due','canceled')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (agency_id, module_code)
);

CREATE INDEX idx_agency_sub_items_agency ON public.agency_subscription_items(agency_id);

ALTER TABLE public.agency_subscription_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agency_sub_items_select" ON public.agency_subscription_items
  FOR SELECT USING (
    agency_id = ANY(get_user_agency_ids())
    OR is_platform_admin()
  );

CREATE POLICY "agency_sub_items_admin_write" ON public.agency_subscription_items
  FOR ALL USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

CREATE TRIGGER set_agency_sub_items_updated_at
  BEFORE UPDATE ON public.agency_subscription_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- 3. Helper: agency_can_grant_free_remaining(agency_id) → int
-- Ritorna quanti grant free gli restano (NULL se illimitato)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.agency_can_grant_free_remaining(p_agency UUID)
RETURNS INT
LANGUAGE SQL STABLE SECURITY DEFINER AS $$
  WITH a AS (
    SELECT free_grant_quota, can_grant_free FROM public.agencies WHERE id = p_agency
  ),
  used AS (
    SELECT COUNT(DISTINCT tenant_id) AS n
    FROM public.module_overrides
    WHERE granted_by_agency_id = p_agency
      AND override_type = 'free'
      AND active = TRUE
  )
  SELECT CASE
    WHEN NOT (SELECT can_grant_free FROM a) THEN 0
    WHEN (SELECT free_grant_quota FROM a) IS NULL THEN NULL
    ELSE GREATEST(0, (SELECT free_grant_quota FROM a) - (SELECT n FROM used))
  END;
$$;

GRANT EXECUTE ON FUNCTION public.agency_can_grant_free_remaining(UUID) TO authenticated, service_role;
