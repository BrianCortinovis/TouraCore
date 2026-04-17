-- 00079: Legal compliance IT — CIN + SDI + RT + ADE complete schemas
-- Hospitality: CIN, fattura SDI hospitality
-- Ristorazione: RT receipts complete, ADE signed payload

-- ============================================================================
-- HOSPITALITY: CIN (Codice Identificativo Nazionale)
-- ============================================================================

ALTER TABLE public.accommodations
  ADD COLUMN IF NOT EXISTS cin_code TEXT,
  ADD COLUMN IF NOT EXISTS cin_assigned_at DATE,
  ADD COLUMN IF NOT EXISTS cin_status TEXT
    CHECK (cin_status IN ('pending','active','suspended','revoked')),
  ADD COLUMN IF NOT EXISTS cin_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_accommodations_cin ON public.accommodations(cin_code) WHERE cin_code IS NOT NULL;

-- ============================================================================
-- HOSPITALITY: Fattura SDI per reservation
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.hospitality_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  reservation_id UUID REFERENCES public.reservations(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL,
  invoice_date DATE NOT NULL,
  invoice_type TEXT NOT NULL DEFAULT 'TD01' CHECK (invoice_type IN ('TD01','TD24','TD25','TD26')),
  customer_name TEXT NOT NULL,
  customer_vat_number TEXT,
  customer_fiscal_code TEXT,
  customer_pec TEXT,
  customer_sdi_code TEXT,
  customer_address TEXT,
  customer_city TEXT,
  customer_zip TEXT,
  customer_country TEXT NOT NULL DEFAULT 'IT',
  amount_subtotal NUMERIC(10,2) NOT NULL,
  amount_vat NUMERIC(10,2) NOT NULL DEFAULT 0,
  amount_total NUMERIC(10,2) NOT NULL,
  vat_pct NUMERIC(4,2) NOT NULL DEFAULT 10,
  vat_exempt_reason TEXT,
  description TEXT,
  xml_sdi_payload TEXT,
  xml_sdi_signed BYTEA,
  sdi_status TEXT NOT NULL DEFAULT 'draft'
    CHECK (sdi_status IN ('draft','submitted','accepted','rejected','partial_accept','expired')),
  sdi_submitted_at TIMESTAMPTZ,
  sdi_response TEXT,
  sdi_identifier TEXT,
  pdf_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (entity_id, invoice_number)
);

CREATE INDEX idx_hospitality_invoices_entity ON public.hospitality_invoices(entity_id, invoice_date DESC);
CREATE INDEX idx_hospitality_invoices_reservation ON public.hospitality_invoices(reservation_id) WHERE reservation_id IS NOT NULL;

ALTER TABLE public.hospitality_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hospitality_invoices_all" ON public.hospitality_invoices
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.entities e
            WHERE e.id = hospitality_invoices.entity_id
              AND (e.tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.entities e
            WHERE e.id = hospitality_invoices.entity_id
              AND (e.tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin()))
  );

CREATE TRIGGER set_hospitality_invoices_updated_at BEFORE UPDATE ON public.hospitality_invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- RISTORAZIONE: fiscal_receipts complete (ricevute reali, no più stub)
-- Estende schema esistente 00075 con campi RT + lottery completi
-- ============================================================================

ALTER TABLE public.fiscal_receipts
  ADD COLUMN IF NOT EXISTS rt_payload TEXT,
  ADD COLUMN IF NOT EXISTS rt_response TEXT,
  ADD COLUMN IF NOT EXISTS rt_status TEXT DEFAULT 'pending'
    CHECK (rt_status IN ('pending','printed','failed','voided')),
  ADD COLUMN IF NOT EXISTS rt_printer_serial TEXT,
  ADD COLUMN IF NOT EXISTS lottery_status TEXT DEFAULT 'none'
    CHECK (lottery_status IN ('none','collected','submitted','accepted','rejected'));

CREATE INDEX IF NOT EXISTS idx_fiscal_receipts_rt_status
  ON public.fiscal_receipts(rt_status) WHERE rt_status IN ('pending','failed');

-- ============================================================================
-- RISTORAZIONE: Recipe ingredients table (FK orphan in 00072)
-- M026 menzionava recipes ma table non esiste — fix
-- ============================================================================

-- recipes esiste già in 00072? verifichiamo
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='recipes') THEN
    -- Crea recipes solo se non esiste (probabile in 00072)
    CREATE TABLE public.recipes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
      menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      yield_qty NUMERIC(10,3) NOT NULL DEFAULT 1,
      yield_unit TEXT,
      total_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
      notes TEXT,
      version SMALLINT NOT NULL DEFAULT 1,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "recipes_all" ON public.recipes
      FOR ALL USING (restaurant_id = ANY(get_user_restaurant_ids()) OR is_platform_admin())
      WITH CHECK (restaurant_id = ANY(get_user_restaurant_ids()) OR is_platform_admin());
  END IF;
END $$;

-- Sanitation log HACCP
CREATE TABLE IF NOT EXISTS public.haccp_sanitation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  area_code TEXT NOT NULL,
  area_name TEXT NOT NULL,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  product_used TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_haccp_sanitation_restaurant ON public.haccp_sanitation_log(restaurant_id, performed_at DESC);

ALTER TABLE public.haccp_sanitation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "haccp_sanitation_log_all" ON public.haccp_sanitation_log
  FOR ALL USING (restaurant_id = ANY(get_user_restaurant_ids()) OR is_platform_admin())
  WITH CHECK (restaurant_id = ANY(get_user_restaurant_ids()) OR is_platform_admin());

-- ============================================================================
-- RISTORAZIONE: Promotions + discounts
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.restaurant_promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  code TEXT,
  name TEXT NOT NULL,
  promo_type TEXT NOT NULL CHECK (promo_type IN ('early_bird','happy_hour','percent_off','fixed_off','free_item','combo')),
  value_pct NUMERIC(5,2),
  value_amount NUMERIC(10,2),
  conditions JSONB NOT NULL DEFAULT '{}'::jsonb,
  valid_from DATE NOT NULL,
  valid_to DATE NOT NULL,
  max_uses INT,
  uses_count INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (restaurant_id, code)
);

CREATE INDEX idx_restaurant_promotions_active
  ON public.restaurant_promotions(restaurant_id) WHERE active = TRUE;

ALTER TABLE public.restaurant_promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "restaurant_promotions_all" ON public.restaurant_promotions
  FOR ALL USING (restaurant_id = ANY(get_user_restaurant_ids()) OR is_platform_admin())
  WITH CHECK (restaurant_id = ANY(get_user_restaurant_ids()) OR is_platform_admin());

CREATE TRIGGER set_restaurant_promotions_updated_at BEFORE UPDATE ON public.restaurant_promotions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- HOSPITALITY: Email/SMS automation triggers
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.message_automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  trigger_event TEXT NOT NULL CHECK (trigger_event IN (
    'reservation.created','reservation.confirmed','reservation.cancelled',
    'check_in_24h','check_in_today','check_out_today','post_stay_24h',
    'restaurant.booking_confirmed','restaurant.deposit_paid'
  )),
  channel TEXT NOT NULL CHECK (channel IN ('email','sms','whatsapp')),
  template_id UUID,
  template_subject TEXT,
  template_body TEXT,
  delay_minutes INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_message_automations_entity_event
  ON public.message_automations(entity_id, trigger_event) WHERE active = TRUE;

ALTER TABLE public.message_automations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "message_automations_all" ON public.message_automations
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.entities e
            WHERE e.id = message_automations.entity_id
              AND (e.tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.entities e
            WHERE e.id = message_automations.entity_id
              AND (e.tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin()))
  );

CREATE TRIGGER set_message_automations_updated_at BEFORE UPDATE ON public.message_automations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Queue messaggi pending
CREATE TABLE IF NOT EXISTS public.message_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  reservation_id UUID,
  guest_id UUID,
  channel TEXT NOT NULL,
  recipient TEXT NOT NULL,
  subject TEXT,
  body TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','sent','failed','cancelled')),
  attempts SMALLINT NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_message_queue_pending ON public.message_queue(status, scheduled_for)
  WHERE status = 'pending';

ALTER TABLE public.message_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "message_queue_all" ON public.message_queue
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.entities e
            WHERE e.id = message_queue.entity_id
              AND (e.tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.entities e
            WHERE e.id = message_queue.entity_id
              AND (e.tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin()))
  );

-- ============================================================================
-- HOSPITALITY: Refunds tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.payment_refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID,
  reservation_id UUID,
  entity_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'EUR',
  reason TEXT,
  reason_category TEXT CHECK (reason_category IN ('cancellation','complaint','overpayment','goodwill','technical','other')),
  stripe_refund_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','processing','succeeded','failed','cancelled')),
  processed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  notes TEXT
);

CREATE INDEX idx_payment_refunds_entity ON public.payment_refunds(entity_id, created_at DESC);
CREATE INDEX idx_payment_refunds_reservation ON public.payment_refunds(reservation_id) WHERE reservation_id IS NOT NULL;

ALTER TABLE public.payment_refunds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payment_refunds_all" ON public.payment_refunds
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.entities e
            WHERE e.id = payment_refunds.entity_id
              AND (e.tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.entities e
            WHERE e.id = payment_refunds.entity_id
              AND (e.tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin()))
  );
