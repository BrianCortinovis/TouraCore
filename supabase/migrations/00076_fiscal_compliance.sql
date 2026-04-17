-- 00076: Fiscal compliance IT — corrispettivi ADE + lottery + B2B SDI invoices + GDPR
-- Modulo: Restaurant M030

CREATE TABLE public.ade_daily_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  submission_date DATE NOT NULL,
  receipts_count INT NOT NULL DEFAULT 0,
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_vat NUMERIC(10,2) NOT NULL DEFAULT 0,
  xml_payload TEXT,
  xml_signed TEXT,
  ade_response TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','submitted','accepted','rejected','retry')),
  attempts SMALLINT NOT NULL DEFAULT 0,
  submitted_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  archive_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (restaurant_id, submission_date)
);

CREATE INDEX idx_ade_daily_restaurant ON public.ade_daily_submissions(restaurant_id, submission_date DESC);
CREATE INDEX idx_ade_daily_pending ON public.ade_daily_submissions(status) WHERE status IN ('pending','retry');

CREATE TABLE public.b2b_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  invoice_date DATE NOT NULL,
  customer_name TEXT NOT NULL,
  customer_vat_number TEXT,
  customer_pec TEXT,
  customer_sdi_code TEXT,
  customer_address TEXT,
  amount_subtotal NUMERIC(10,2) NOT NULL,
  amount_vat NUMERIC(10,2) NOT NULL,
  amount_total NUMERIC(10,2) NOT NULL,
  vat_pct NUMERIC(4,2) NOT NULL DEFAULT 10,
  description TEXT,
  order_id UUID REFERENCES public.restaurant_orders(id) ON DELETE SET NULL,
  xml_sdi_payload TEXT,
  sdi_status TEXT NOT NULL DEFAULT 'draft'
    CHECK (sdi_status IN ('draft','submitted','accepted','rejected','partial_accept')),
  sdi_submitted_at TIMESTAMPTZ,
  sdi_response TEXT,
  pdf_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (restaurant_id, invoice_number)
);

CREATE INDEX idx_b2b_invoices_restaurant_date ON public.b2b_invoices(restaurant_id, invoice_date DESC);

CREATE TABLE public.gdpr_retention_policy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('fiscal','marketing','reservation','guest_pii','employment','haccp')),
  retention_days INT NOT NULL,
  legal_basis TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (restaurant_id, category)
);

ALTER TABLE public.ade_daily_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.b2b_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gdpr_retention_policy ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ade_daily_submissions_all" ON public.ade_daily_submissions
  FOR ALL USING (restaurant_id = ANY(get_user_restaurant_ids()) OR is_platform_admin())
  WITH CHECK (restaurant_id = ANY(get_user_restaurant_ids()) OR is_platform_admin());

CREATE POLICY "b2b_invoices_all" ON public.b2b_invoices
  FOR ALL USING (restaurant_id = ANY(get_user_restaurant_ids()) OR is_platform_admin())
  WITH CHECK (restaurant_id = ANY(get_user_restaurant_ids()) OR is_platform_admin());

CREATE POLICY "gdpr_retention_policy_all" ON public.gdpr_retention_policy
  FOR ALL USING (restaurant_id = ANY(get_user_restaurant_ids()) OR is_platform_admin())
  WITH CHECK (restaurant_id = ANY(get_user_restaurant_ids()) OR is_platform_admin());

CREATE TRIGGER set_ade_daily_updated_at BEFORE UPDATE ON public.ade_daily_submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_b2b_invoices_updated_at BEFORE UPDATE ON public.b2b_invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_gdpr_retention_updated_at BEFORE UPDATE ON public.gdpr_retention_policy
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- Function: build_ade_daily_xml — placeholder XML schema 1.0
-- ============================================================================

CREATE OR REPLACE FUNCTION build_ade_daily_xml(p_restaurant_id UUID, p_date DATE)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_total NUMERIC(10,2);
  v_vat NUMERIC(10,2);
  v_count INT;
  v_xml TEXT;
BEGIN
  SELECT
    COALESCE(SUM(amount_total), 0),
    COALESCE(SUM(vat_total), 0),
    COUNT(*)
  INTO v_total, v_vat, v_count
  FROM public.fiscal_receipts
  WHERE restaurant_id = p_restaurant_id
    AND fiscal_date = p_date;

  v_xml := format(
    '<?xml version="1.0" encoding="UTF-8"?><Corrispettivi xmlns="http://www.agenziaentrate.gov.it/corrispettivi/v1.0"><Header><RestaurantId>%s</RestaurantId><Date>%s</Date></Header><Summary><ReceiptsCount>%s</ReceiptsCount><AmountTotal>%s</AmountTotal><VatTotal>%s</VatTotal></Summary></Corrispettivi>',
    p_restaurant_id, p_date, v_count, v_total, v_vat
  );

  RETURN v_xml;
END;
$$;
