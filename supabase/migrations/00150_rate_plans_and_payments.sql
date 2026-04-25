-- Migration 00150: Rate plans + payment methods/attempts + reservation payment state
-- Fasi 2-6 del refactor billing Stripe Connect Direct Charge.
--
-- Rate plans: tariffe selezionabili per entity (4 tipi) con cancellation policy
-- Payment methods: token Stripe carta salvata per addebiti differiti
-- Payment attempts: storico tentativi charge (per retry + audit)
-- Colonne su reservations: rate_plan_id, charge_scheduled_at, payment_state

-- ============================================================
-- 1. RATE PLANS (per entity, tutti verticali)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.rate_plans (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  entity_id                UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,

  vertical                 TEXT NOT NULL
    CHECK (vertical IN ('hospitality', 'restaurant', 'bike', 'experience')),

  type                     TEXT NOT NULL
    CHECK (type IN ('free_cancellation', 'deposit_30', 'partially_refundable_50', 'non_refundable')),

  name                     TEXT NOT NULL,
  description              TEXT,

  -- Politica cancellazione
  refund_window_hours      INT NOT NULL DEFAULT 168, -- 168h = 7gg

  -- Deposito (per deposit_30 / partially_refundable)
  deposit_pct              NUMERIC(5,2),  -- es. 30.00 → 30%

  -- Sconto applicato (per non_refundable)
  discount_pct             NUMERIC(5,2),

  -- Quando addebitare il saldo (offset in giorni rispetto check-in/start)
  charge_balance_days_before INT,

  is_default               BOOLEAN NOT NULL DEFAULT false,
  active                   BOOLEAN NOT NULL DEFAULT true,
  sort_order               INT NOT NULL DEFAULT 0,

  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_plans_entity
  ON public.rate_plans (entity_id, active, sort_order);

CREATE UNIQUE INDEX IF NOT EXISTS uq_rate_plans_default_per_entity
  ON public.rate_plans (entity_id) WHERE is_default = true;

ALTER TABLE public.rate_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY rate_plans_tenant_read ON public.rate_plans
  FOR SELECT TO authenticated
  USING (
    tenant_id = ANY(public.get_user_tenant_ids())
    OR coalesce((auth.jwt() -> 'app_metadata' ->> 'is_platform_admin')::boolean, false)
  );

CREATE POLICY rate_plans_tenant_write ON public.rate_plans
  FOR ALL TO authenticated
  USING (
    tenant_id = ANY(public.get_user_tenant_ids())
  )
  WITH CHECK (
    tenant_id = ANY(public.get_user_tenant_ids())
  );

-- Read pubblico per booking widget (solo active)
CREATE POLICY rate_plans_public_read ON public.rate_plans
  FOR SELECT TO anon
  USING (active = true);

CREATE POLICY rate_plans_service_all ON public.rate_plans
  FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMENT ON TABLE public.rate_plans IS
  'Tariffe selezionabili per entity. 4 tipi: free_cancellation, deposit_30, partially_refundable_50, non_refundable. Vale per tutti 4 verticali.';

-- ============================================================
-- 2. RESERVATION PAYMENT METHODS (carta salvata)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.reservation_payment_methods (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Polimorfico: link a una qualsiasi reservation table tramite (vertical + reservation_id)
  vertical                 TEXT NOT NULL CHECK (vertical IN ('hospitality', 'restaurant', 'bike', 'experience')),
  reservation_id           UUID NOT NULL,

  tenant_id                UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

  stripe_customer_id       TEXT NOT NULL,
  stripe_payment_method_id TEXT NOT NULL,
  stripe_setup_intent_id   TEXT,

  card_brand               TEXT,
  card_last4               TEXT,
  card_exp_month           INT,
  card_exp_year            INT,
  card_funding             TEXT,  -- 'credit' / 'debit' / 'prepaid'
  card_country             TEXT,

  is_primary               BOOLEAN NOT NULL DEFAULT true,

  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (vertical, reservation_id, stripe_payment_method_id)
);

CREATE INDEX IF NOT EXISTS idx_payment_methods_reservation
  ON public.reservation_payment_methods (vertical, reservation_id);

ALTER TABLE public.reservation_payment_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY pm_service_all ON public.reservation_payment_methods
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY pm_tenant_read ON public.reservation_payment_methods
  FOR SELECT TO authenticated
  USING (
    tenant_id = ANY(public.get_user_tenant_ids())
  );

-- ============================================================
-- 3. RESERVATION PAYMENT ATTEMPTS (audit retry)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.reservation_payment_attempts (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  vertical                 TEXT NOT NULL CHECK (vertical IN ('hospitality', 'restaurant', 'bike', 'experience')),
  reservation_id           UUID NOT NULL,
  tenant_id                UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

  attempt_number           INT NOT NULL DEFAULT 1,

  stripe_payment_intent_id TEXT,
  amount_cents             INT NOT NULL,
  currency                 TEXT NOT NULL DEFAULT 'EUR',

  status                   TEXT NOT NULL CHECK (status IN ('processing', 'succeeded', 'requires_action', 'failed', 'cancelled')),

  failure_code             TEXT,
  failure_message          TEXT,

  attempted_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at             TIMESTAMPTZ,
  retry_at                 TIMESTAMPTZ,

  metadata                 JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_payment_attempts_reservation
  ON public.reservation_payment_attempts (vertical, reservation_id, attempt_number DESC);

CREATE INDEX IF NOT EXISTS idx_payment_attempts_retry
  ON public.reservation_payment_attempts (retry_at)
  WHERE status = 'failed' AND retry_at IS NOT NULL;

ALTER TABLE public.reservation_payment_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY pa_service_all ON public.reservation_payment_attempts
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY pa_tenant_read ON public.reservation_payment_attempts
  FOR SELECT TO authenticated
  USING (
    tenant_id = ANY(public.get_user_tenant_ids())
  );

-- ============================================================
-- 4. COLONNE PAYMENT STATE SU RESERVATIONS (4 tabelle)
-- ============================================================

ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS rate_plan_id UUID REFERENCES public.rate_plans(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS charge_scheduled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_state TEXT
    CHECK (payment_state IN ('pending', 'card_saved', 'authorized', 'captured', 'failed', 'auto_cancelled', 'refunded')),
  ADD COLUMN IF NOT EXISTS application_fee_amount_cents INT;

CREATE INDEX IF NOT EXISTS idx_reservations_charge_scheduled
  ON public.reservations (charge_scheduled_at)
  WHERE charge_scheduled_at IS NOT NULL AND payment_state IN ('card_saved', 'failed');

ALTER TABLE public.restaurant_reservations
  ADD COLUMN IF NOT EXISTS rate_plan_id UUID REFERENCES public.rate_plans(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS charge_scheduled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_state TEXT
    CHECK (payment_state IN ('pending', 'card_saved', 'authorized', 'captured', 'failed', 'auto_cancelled', 'refunded')),
  ADD COLUMN IF NOT EXISTS application_fee_amount_cents INT;

ALTER TABLE public.bike_rental_reservations
  ADD COLUMN IF NOT EXISTS rate_plan_id UUID REFERENCES public.rate_plans(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS charge_scheduled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_state TEXT
    CHECK (payment_state IN ('pending', 'card_saved', 'authorized', 'captured', 'failed', 'auto_cancelled', 'refunded')),
  ADD COLUMN IF NOT EXISTS application_fee_amount_cents INT;

ALTER TABLE public.experience_reservations
  ADD COLUMN IF NOT EXISTS rate_plan_id UUID REFERENCES public.rate_plans(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS charge_scheduled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_state TEXT
    CHECK (payment_state IN ('pending', 'card_saved', 'authorized', 'captured', 'failed', 'auto_cancelled', 'refunded')),
  ADD COLUMN IF NOT EXISTS application_fee_amount_cents INT;

-- ============================================================
-- 5. UPDATED_AT TRIGGERS (riusa pattern esistente)
-- ============================================================

CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS rate_plans_set_updated ON public.rate_plans;
CREATE TRIGGER rate_plans_set_updated
  BEFORE UPDATE ON public.rate_plans
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
