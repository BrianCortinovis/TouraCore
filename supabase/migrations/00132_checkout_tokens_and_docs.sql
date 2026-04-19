-- M094: checkout remoto + upload documenti + tassa soggiorno payment tracking

-- ============================================================================
-- 1. CHECKOUT_TOKENS — token per check-out remoto (guest self-service)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.checkout_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text UNIQUE NOT NULL,
  entity_id uuid NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES public.reservations(id) ON DELETE SET NULL,
  guest_email text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','started','completed','expired')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  completed_at timestamptz,
  feedback_rating int CHECK (feedback_rating BETWEEN 1 AND 5),
  feedback_comment text,
  damage_reported boolean NOT NULL DEFAULT false,
  damage_description text,
  damage_photos jsonb NOT NULL DEFAULT '[]'::jsonb,
  signature_data_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_checkout_tokens_entity ON public.checkout_tokens (entity_id, status);
CREATE INDEX IF NOT EXISTS idx_checkout_tokens_booking ON public.checkout_tokens (booking_id);

ALTER TABLE public.checkout_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "checkout_tokens_tenant_select" ON public.checkout_tokens;
CREATE POLICY "checkout_tokens_tenant_select" ON public.checkout_tokens
  FOR SELECT
  USING (
    public.is_platform_admin()
    OR entity_id IN (
      SELECT e.id FROM public.entities e
      JOIN public.memberships m ON m.tenant_id = e.tenant_id
      WHERE m.user_id = auth.uid() AND m.is_active = true
    )
  );

-- Public token-based access (anon) handled via service_role in server action

-- ============================================================================
-- 2. DOCUMENT_SCANS — metadata upload docs (fronte/retro) check-in + check-out
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.document_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id uuid NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  reservation_id uuid REFERENCES public.reservations(id) ON DELETE SET NULL,
  checkin_token_id uuid REFERENCES public.checkin_tokens(id) ON DELETE SET NULL,
  checkout_token_id uuid REFERENCES public.checkout_tokens(id) ON DELETE SET NULL,
  guest_id uuid,
  kind text NOT NULL CHECK (kind IN ('id_front','id_back','passport','license','other')),
  storage_path text NOT NULL,
  mime_type text,
  size_bytes bigint,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  retention_expires_at timestamptz,
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_document_scans_entity ON public.document_scans (entity_id, uploaded_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_document_scans_checkin ON public.document_scans (checkin_token_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_document_scans_checkout ON public.document_scans (checkout_token_id) WHERE deleted_at IS NULL;

ALTER TABLE public.document_scans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "document_scans_tenant_select" ON public.document_scans;
CREATE POLICY "document_scans_tenant_select" ON public.document_scans
  FOR SELECT
  USING (
    public.is_platform_admin()
    OR entity_id IN (
      SELECT e.id FROM public.entities e
      JOIN public.memberships m ON m.tenant_id = e.tenant_id
      WHERE m.user_id = auth.uid() AND m.is_active = true
    )
  );

-- ============================================================================
-- 3. TOURIST_TAX_RECORDS — aggiungi campo Stripe payment intent per tracciare pagamento online
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tourist_tax_records') THEN
    ALTER TABLE public.tourist_tax_records
      ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text,
      ADD COLUMN IF NOT EXISTS paid_via text CHECK (paid_via IN ('cash','card_onsite','online_checkin','bank_transfer','exempt')),
      ADD COLUMN IF NOT EXISTS paid_online_at timestamptz;
  END IF;
END$$;

-- ============================================================================
-- 4. CHECKIN_TOKENS — aggiungi campi payment + signature + checkout flag
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'checkin_tokens') THEN
    ALTER TABLE public.checkin_tokens
      ADD COLUMN IF NOT EXISTS tourist_tax_amount_cents int,
      ADD COLUMN IF NOT EXISTS tourist_tax_payment_intent_id text,
      ADD COLUMN IF NOT EXISTS tourist_tax_paid_at timestamptz,
      ADD COLUMN IF NOT EXISTS signature_data_url text;
  END IF;
END$$;
