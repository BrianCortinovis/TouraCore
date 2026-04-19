-- M090 follow-up: billing grace period on tenants for payment_failed handling

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS billing_grace_until TIMESTAMPTZ;

COMMENT ON COLUMN public.tenants.billing_grace_until IS 'Se set, tenant in grace period dopo invoice.payment_failed. Dopo questa data i moduli vanno disattivati.';

CREATE INDEX IF NOT EXISTS idx_tenants_billing_grace
  ON public.tenants (billing_grace_until)
  WHERE billing_grace_until IS NOT NULL;
