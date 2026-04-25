-- Migration 00149: Stripe Connect su tenants
-- Onboarding Express: tenant collega proprio account Stripe (5min KYC).
-- TouraCore mai banca: cliente paga direttamente al Connect account del tenant
-- via Direct Charge, application_fee_amount va a TouraCore.
-- Cron + webhook leggono charges_enabled per gating pubblicazione.

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS stripe_connect_account_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS stripe_connect_charges_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_connect_payouts_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_connect_details_submitted BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_connect_country TEXT,
  ADD COLUMN IF NOT EXISTS stripe_connect_requirements JSONB,
  ADD COLUMN IF NOT EXISTS stripe_connect_updated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_tenants_stripe_connect
  ON public.tenants (stripe_connect_account_id)
  WHERE stripe_connect_account_id IS NOT NULL;

COMMENT ON COLUMN public.tenants.stripe_connect_account_id IS
  'Stripe Express Connect account id. Required for publishing entities (gating).';
COMMENT ON COLUMN public.tenants.stripe_connect_charges_enabled IS
  'Stripe webhook account.updated → true quando KYC completo e tenant può accettare pagamenti.';
