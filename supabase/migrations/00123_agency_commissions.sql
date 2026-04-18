-- M072 S01: agency commissions ledger cross-vertical, polymorphic
CREATE TABLE IF NOT EXISTS public.agency_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  reservation_type text NOT NULL CHECK (reservation_type IN ('hospitality','restaurant','experience','bike','other')),
  reservation_id uuid,
  reservation_external_ref text,
  gross_amount numeric(12,2) NOT NULL,
  commission_rate numeric(5,4) NOT NULL,
  commission_amount numeric(12,2) NOT NULL,
  currency text NOT NULL DEFAULT 'EUR',
  status text NOT NULL DEFAULT 'accrued' CHECK (status IN ('accrued','reversed','paid')),
  accrued_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  payout_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agency_commissions_agency_accrued ON public.agency_commissions (agency_id, accrued_at DESC);
CREATE INDEX IF NOT EXISTS idx_agency_commissions_tenant ON public.agency_commissions (tenant_id);
CREATE INDEX IF NOT EXISTS idx_agency_commissions_status ON public.agency_commissions (status, accrued_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_agency_commissions_resv ON public.agency_commissions (agency_id, reservation_type, reservation_id) WHERE reservation_id IS NOT NULL;

ALTER TABLE public.agency_commissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agency_commissions_select" ON public.agency_commissions;
CREATE POLICY "agency_commissions_select" ON public.agency_commissions
  FOR SELECT
  USING (
    public.is_platform_admin()
    OR agency_id IN (
      SELECT agency_id FROM public.agency_memberships
      WHERE user_id = auth.uid() AND is_active = true
    )
  );
