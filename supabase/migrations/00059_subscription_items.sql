-- 00059: tenants.modules shape + subscription_items + activation log
-- Dipende da: subscriptions (00021), tenants (00002), module_catalog (00058)
-- Fase F1 — foundation multi-module

-- ============================================================================
-- 1. NORMALIZE tenants.modules shape (da {hospitality:true} a {hospitality:{active,since,source}})
-- ============================================================================

-- Rebuild existing modules JSONB to richer shape: {code: {active, since, source}}
UPDATE public.tenants
SET modules = (
  SELECT jsonb_object_agg(
    key,
    jsonb_build_object(
      'active', COALESCE(value::boolean, FALSE),
      'source', 'legacy',
      'since', COALESCE(created_at::text, NOW()::text)
    )
  )
  FROM jsonb_each_text(modules)
)
WHERE modules IS NOT NULL
  AND modules != '{}'::jsonb
  AND NOT EXISTS (
    SELECT 1 FROM jsonb_each(modules) je
    WHERE jsonb_typeof(je.value) = 'object'
  );

-- Ensure default for tenants with empty modules: activate hospitality legacy
UPDATE public.tenants
SET modules = jsonb_build_object(
  'hospitality', jsonb_build_object('active', TRUE, 'source', 'legacy', 'since', COALESCE(created_at::text, NOW()::text))
)
WHERE modules = '{}'::jsonb OR modules IS NULL;

-- ============================================================================
-- 2. SUBSCRIPTION_ITEMS — 1 riga per modulo attivo per tenant (Stripe mirror)
-- ============================================================================

CREATE TABLE public.subscription_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  module_code TEXT NOT NULL REFERENCES public.module_catalog(code),
  stripe_subscription_item_id TEXT,
  quantity INT NOT NULL DEFAULT 1,
  unit_amount_eur NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'trialing'
    CHECK (status IN ('trialing','active','paused','past_due','canceled')),
  trial_end TIMESTAMPTZ,
  paused_until TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, module_code)
);

CREATE INDEX idx_subscription_items_tenant ON public.subscription_items(tenant_id);
CREATE INDEX idx_subscription_items_stripe ON public.subscription_items(stripe_subscription_item_id);
CREATE INDEX idx_subscription_items_status ON public.subscription_items(status);

ALTER TABLE public.subscription_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscription_items_select" ON public.subscription_items
  FOR SELECT USING (
    tenant_id = ANY(get_user_tenant_ids())
    OR is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM public.agency_tenant_links atl
      WHERE atl.tenant_id = subscription_items.tenant_id
        AND atl.agency_id = ANY(get_user_agency_ids())
        AND atl.status = 'active'
    )
  );

CREATE POLICY "subscription_items_admin_write" ON public.subscription_items
  FOR ALL USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

CREATE TRIGGER set_subscription_items_updated_at
  BEFORE UPDATE ON public.subscription_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- 3. MODULE_ACTIVATION_LOG — audit di tutte le operazioni su moduli
-- ============================================================================

CREATE TABLE public.module_activation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  module_code TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN (
    'activated','deactivated','paused','resumed',
    'trial_started','trial_ended','payment_failed',
    'free_granted','free_revoked','override_applied','override_removed',
    'billing_profile_changed'
  )),
  actor_user_id UUID REFERENCES auth.users(id),
  actor_scope TEXT CHECK (actor_scope IN ('super_admin','agency','tenant_owner','system')),
  actor_agency_id UUID REFERENCES public.agencies(id),
  stripe_event_id TEXT,
  payload JSONB DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_module_activation_log_tenant ON public.module_activation_log(tenant_id, created_at DESC);
CREATE INDEX idx_module_activation_log_module ON public.module_activation_log(module_code, created_at DESC);

ALTER TABLE public.module_activation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "module_activation_log_select" ON public.module_activation_log
  FOR SELECT USING (
    tenant_id = ANY(get_user_tenant_ids())
    OR is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM public.agency_tenant_links atl
      WHERE atl.tenant_id = module_activation_log.tenant_id
        AND atl.agency_id = ANY(get_user_agency_ids())
        AND atl.status = 'active'
    )
  );

-- Insert permitted to all authenticated (actor tracking via actor_user_id; UI autoriza)
CREATE POLICY "module_activation_log_insert" ON public.module_activation_log
  FOR INSERT WITH CHECK (
    tenant_id = ANY(get_user_tenant_ids())
    OR is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM public.agency_tenant_links atl
      WHERE atl.tenant_id = module_activation_log.tenant_id
        AND atl.agency_id = ANY(get_user_agency_ids())
        AND atl.status = 'active'
    )
  );
