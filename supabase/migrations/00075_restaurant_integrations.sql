-- 00075: Restaurant integrations — TheFork, Google Reserve, RT fiscale
-- Modulo: Restaurant M029

CREATE TABLE public.restaurant_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN (
    'thefork','google_reserve','opentable','rt_fiscal_it','printer_kitchen','deliveroo','justeat'
  )),
  config_encrypted TEXT,
  config_meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT,
  last_sync_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (restaurant_id, provider)
);

CREATE INDEX idx_restaurant_integrations_active ON public.restaurant_integrations(restaurant_id, is_active);

CREATE TABLE public.fiscal_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.restaurant_orders(id) ON DELETE SET NULL,
  receipt_number TEXT,
  fiscal_date DATE NOT NULL,
  amount_total NUMERIC(10,2) NOT NULL,
  vat_total NUMERIC(10,2) NOT NULL,
  lottery_code TEXT,
  rt_serial TEXT,
  ade_submission_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (ade_submission_status IN ('pending','submitted','accepted','rejected')),
  ade_submitted_at TIMESTAMPTZ,
  ade_response JSONB,
  xml_archive_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_fiscal_receipts_restaurant_date ON public.fiscal_receipts(restaurant_id, fiscal_date DESC);
CREATE INDEX idx_fiscal_receipts_pending ON public.fiscal_receipts(ade_submission_status) WHERE ade_submission_status = 'pending';

CREATE TABLE public.integration_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES public.restaurant_integrations(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('inbound','outbound')),
  payload JSONB,
  status TEXT NOT NULL DEFAULT 'ok' CHECK (status IN ('ok','warning','error')),
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_integration_sync_log_int ON public.integration_sync_log(integration_id, created_at DESC);

ALTER TABLE public.restaurant_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiscal_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "restaurant_integrations_all" ON public.restaurant_integrations
  FOR ALL USING (restaurant_id = ANY(get_user_restaurant_ids()) OR is_platform_admin())
  WITH CHECK (restaurant_id = ANY(get_user_restaurant_ids()) OR is_platform_admin());

CREATE POLICY "fiscal_receipts_all" ON public.fiscal_receipts
  FOR ALL USING (restaurant_id = ANY(get_user_restaurant_ids()) OR is_platform_admin())
  WITH CHECK (restaurant_id = ANY(get_user_restaurant_ids()) OR is_platform_admin());

CREATE POLICY "integration_sync_log_all" ON public.integration_sync_log
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.restaurant_integrations ri WHERE ri.id = integration_sync_log.integration_id
            AND (ri.restaurant_id = ANY(get_user_restaurant_ids()) OR is_platform_admin()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.restaurant_integrations ri WHERE ri.id = integration_sync_log.integration_id
            AND (ri.restaurant_id = ANY(get_user_restaurant_ids()) OR is_platform_admin()))
  );

CREATE TRIGGER set_restaurant_integrations_updated_at BEFORE UPDATE ON public.restaurant_integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_fiscal_receipts_updated_at BEFORE UPDATE ON public.fiscal_receipts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
