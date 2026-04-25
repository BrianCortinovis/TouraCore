-- Migration 00148: agency_payouts
-- Ledger payout mensili da TouraCore → agenzie via Stripe Connect Transfer.
-- Aggrega le righe di agency_commissions con status='accrued' del periodo,
-- esegue il transfer e segna le commissioni come 'paid' linkate al payout.
--
-- Stati:
--   pending    : creato dal cron, non ancora inviato a Stripe
--   processing : transfer richiesto a Stripe, in attesa conferma
--   paid       : transfer riuscito (transfer_id presente)
--   failed     : Stripe ha rifiutato (error_message presente)

CREATE TABLE IF NOT EXISTS public.agency_payouts (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id                UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,

  period_month             DATE NOT NULL,

  gross_amount             NUMERIC(12,2) NOT NULL DEFAULT 0,
  platform_fee_amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_amount               NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency                 TEXT NOT NULL DEFAULT 'EUR',

  commissions_count        INT NOT NULL DEFAULT 0,

  stripe_transfer_id       TEXT,
  stripe_destination       TEXT,

  status                   TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'paid', 'failed')),
  error_message            TEXT,

  metadata                 JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at             TIMESTAMPTZ,
  paid_at                  TIMESTAMPTZ,

  UNIQUE (agency_id, period_month)
);

CREATE INDEX IF NOT EXISTS idx_agency_payouts_agency
  ON public.agency_payouts (agency_id, period_month DESC);

CREATE INDEX IF NOT EXISTS idx_agency_payouts_status
  ON public.agency_payouts (status, created_at DESC)
  WHERE status IN ('pending', 'processing', 'failed');

ALTER TABLE public.agency_payouts ENABLE ROW LEVEL SECURITY;

-- Service role only (cron + webhook). Nessun accesso utente diretto.
CREATE POLICY agency_payouts_service_only ON public.agency_payouts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Lettura per platform admin via JWT claim (consistente con altre tabelle billing)
CREATE POLICY agency_payouts_platform_read ON public.agency_payouts
  FOR SELECT
  TO authenticated
  USING (
    coalesce(
      (auth.jwt() -> 'app_metadata' ->> 'is_platform_admin')::boolean,
      false
    )
  );

-- Lettura per membri dell'agenzia (vedono solo i propri payout)
CREATE POLICY agency_payouts_agency_read ON public.agency_payouts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.agency_memberships am
      WHERE am.agency_id = agency_payouts.agency_id
        AND am.user_id = auth.uid()
        AND am.is_active = true
    )
  );

COMMENT ON TABLE public.agency_payouts IS
  'Ledger payout mensili TouraCore → agenzia. Aggregato di agency_commissions accrued per period_month.';

-- Lega ex-post payout_id su agency_commissions (colonna esistente da 00123)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'agency_commissions'
      AND constraint_name = 'agency_commissions_payout_id_fkey'
  ) THEN
    ALTER TABLE public.agency_commissions
      ADD CONSTRAINT agency_commissions_payout_id_fkey
      FOREIGN KEY (payout_id) REFERENCES public.agency_payouts(id) ON DELETE SET NULL;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_agency_commissions_payout
  ON public.agency_commissions (payout_id)
  WHERE payout_id IS NOT NULL;
