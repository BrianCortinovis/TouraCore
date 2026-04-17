-- 00082: Documents unified table (refactor A)
-- Unifica: invoices (hospitality), hospitality_invoices, b2b_invoices (restaurant), fiscal_receipts, ade_daily_submissions
-- Mantiene tutte le tabelle esistenti per backward compatibility (drop dopo 30gg)

CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  -- Discriminator
  document_type TEXT NOT NULL CHECK (document_type IN (
    'hospitality_invoice','b2b_invoice','fiscal_receipt','ade_corrispettivi','credit_note','quote','receipt'
  )),
  vertical TEXT NOT NULL CHECK (vertical IN ('hospitality','restaurant','wellness','experiences','bike_rental','moto_rental','ski_school')),
  -- Numbering
  document_number TEXT NOT NULL,
  document_date DATE NOT NULL,
  series TEXT,
  -- Customer (cessionario)
  customer_name TEXT,
  customer_vat_number TEXT,
  customer_fiscal_code TEXT,
  customer_pec TEXT,
  customer_sdi_code TEXT,
  customer_address TEXT,
  customer_city TEXT,
  customer_zip TEXT,
  customer_country TEXT NOT NULL DEFAULT 'IT',
  -- Amounts
  amount_subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  amount_vat NUMERIC(10,2) NOT NULL DEFAULT 0,
  amount_total NUMERIC(10,2) NOT NULL DEFAULT 0,
  vat_pct NUMERIC(4,2) NOT NULL DEFAULT 10,
  vat_exempt_reason TEXT,
  currency TEXT NOT NULL DEFAULT 'EUR',
  -- Line items (JSONB per evitare child table per ora; refactor invoice_items in v2 se serve)
  line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  description TEXT,
  -- Reference (link sorgente)
  source_type TEXT, -- 'reservation','restaurant_order','manual'
  source_id UUID,
  -- SDI (FatturaPA)
  xml_payload TEXT,
  xml_signed BYTEA,
  sdi_status TEXT CHECK (sdi_status IN ('draft','submitted','accepted','rejected','partial_accept','expired') OR sdi_status IS NULL),
  sdi_submitted_at TIMESTAMPTZ,
  sdi_response TEXT,
  sdi_identifier TEXT,
  -- RT/Lottery (ristorante fiscal_receipts)
  rt_serial TEXT,
  rt_status TEXT CHECK (rt_status IN ('pending','printed','failed','voided') OR rt_status IS NULL),
  rt_payload TEXT,
  rt_response TEXT,
  lottery_code TEXT,
  lottery_status TEXT,
  -- ADE submission ref (per fiscal_receipts che linkano a ade_daily_submission)
  ade_submission_id UUID,
  -- Storage
  pdf_url TEXT,
  archive_url TEXT,
  -- Payment status
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending','paid','partial','refunded','void')),
  paid_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  -- Metadata vertical-specific (estensibile senza migration)
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Audit
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Document number unico per (entity, document_type, year-of-date)
  UNIQUE (entity_id, document_type, document_number)
);

-- Indici performance
CREATE INDEX idx_documents_entity_date ON public.documents(entity_id, document_date DESC);
CREATE INDEX idx_documents_type ON public.documents(document_type, document_date DESC);
CREATE INDEX idx_documents_tenant_vertical ON public.documents(tenant_id, vertical);
CREATE INDEX idx_documents_source ON public.documents(source_type, source_id) WHERE source_id IS NOT NULL;
CREATE INDEX idx_documents_sdi_pending ON public.documents(sdi_status) WHERE sdi_status IN ('draft','submitted');
CREATE INDEX idx_documents_rt_pending ON public.documents(rt_status) WHERE rt_status = 'pending';

-- ============================================================================
-- CHECK constraints semantici per vertical/document_type
-- ============================================================================

-- fiscal_receipt è solo restaurant
ALTER TABLE public.documents ADD CONSTRAINT chk_fiscal_receipt_only_restaurant
  CHECK (document_type != 'fiscal_receipt' OR vertical = 'restaurant');

-- hospitality_invoice è solo hospitality
ALTER TABLE public.documents ADD CONSTRAINT chk_hospitality_invoice_vertical
  CHECK (document_type != 'hospitality_invoice' OR vertical = 'hospitality');

-- ade_corrispettivi è solo restaurant
ALTER TABLE public.documents ADD CONSTRAINT chk_ade_only_restaurant
  CHECK (document_type != 'ade_corrispettivi' OR vertical = 'restaurant');

-- lottery_code valido solo per fiscal_receipt
ALTER TABLE public.documents ADD CONSTRAINT chk_lottery_only_fiscal
  CHECK (lottery_code IS NULL OR document_type = 'fiscal_receipt');

-- rt_* fields solo per fiscal_receipt o ade_corrispettivi
ALTER TABLE public.documents ADD CONSTRAINT chk_rt_fields_only_fiscal
  CHECK (rt_status IS NULL OR document_type IN ('fiscal_receipt','ade_corrispettivi'));

-- ============================================================================
-- RLS: stesso pattern di altre tabelle (entity_id chain)
-- ============================================================================

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "documents_select" ON public.documents
  FOR SELECT USING (
    tenant_id = ANY(get_user_tenant_ids())
    OR is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM public.agency_tenant_links atl
      WHERE atl.tenant_id = documents.tenant_id
        AND atl.agency_id = ANY(get_user_agency_ids())
        AND atl.status = 'active'
    )
  );

CREATE POLICY "documents_insert" ON public.documents
  FOR INSERT WITH CHECK (
    tenant_id = ANY(get_user_tenant_ids())
    OR is_platform_admin()
  );

CREATE POLICY "documents_update" ON public.documents
  FOR UPDATE USING (
    tenant_id = ANY(get_user_tenant_ids())
    OR is_platform_admin()
  );

CREATE POLICY "documents_delete" ON public.documents
  FOR DELETE USING (
    tenant_id = ANY(get_user_tenant_ids())
    OR is_platform_admin()
  );

-- Trigger updated_at
CREATE TRIGGER set_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- BACKFILL: copia dati da tabelle esistenti -> documents
-- Mantieni tabelle originali per backward compat 30gg
-- ============================================================================

-- 1. invoices (hospitality, schema 00037: entity_id, subtotal, total_vat, total, xml_content)
DO $$
DECLARE
  has_entity_id BOOLEAN;
BEGIN
  -- Verifica se invoices ha entity_id (schema 00037) o solo tenant_id (schema 00021)
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='invoices' AND column_name='entity_id'
  ) INTO has_entity_id;

  IF has_entity_id THEN
    INSERT INTO public.documents (
      id, tenant_id, entity_id, document_type, vertical,
      document_number, document_date,
      customer_name, customer_vat_number, customer_fiscal_code, customer_pec, customer_sdi_code,
      customer_address, customer_city, customer_zip, customer_country,
      amount_subtotal, amount_vat, amount_total,
      currency, description,
      xml_payload, sdi_status, sdi_identifier, pdf_url,
      payment_status,
      created_at, updated_at,
      metadata
    )
    SELECT
      i.id,
      e.tenant_id,
      i.entity_id,
      'hospitality_invoice',
      'hospitality',
      i.invoice_number,
      i.invoice_date::DATE,
      i.customer_name, i.customer_vat, i.customer_fiscal_code,
      i.customer_pec, i.customer_sdi_code,
      i.customer_address, i.customer_city, i.customer_zip, COALESCE(i.customer_country, 'IT'),
      COALESCE(i.subtotal, 0), COALESCE(i.total_vat, 0), COALESCE(i.total, 0),
      'EUR',
      i.notes,
      i.xml_content, i.sdi_status, i.sdi_identifier, i.pdf_url,
      COALESCE(i.payment_status, 'pending'),
      i.created_at,
      COALESCE(i.updated_at, i.created_at),
      jsonb_build_object('original_table', 'invoices', 'invoice_type', i.invoice_type, 'reservation_id', i.reservation_id)
    FROM public.invoices i
    JOIN public.entities e ON e.id = i.entity_id
    ON CONFLICT (entity_id, document_type, document_number) DO NOTHING;
  END IF;
END $$;

-- 2. hospitality_invoices (table SDI hospitality dedicata)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='hospitality_invoices') THEN
    INSERT INTO public.documents (
      id, tenant_id, entity_id, document_type, vertical,
      document_number, document_date,
      customer_name, customer_vat_number, customer_fiscal_code, customer_pec, customer_sdi_code,
      customer_address, customer_city, customer_zip, customer_country,
      amount_subtotal, amount_vat, amount_total, vat_pct, vat_exempt_reason,
      description, xml_payload, sdi_status, sdi_submitted_at, sdi_response, sdi_identifier,
      pdf_url,
      created_at, updated_at,
      metadata
    )
    SELECT
      hi.id,
      e.tenant_id,
      hi.entity_id,
      'hospitality_invoice',
      'hospitality',
      hi.invoice_number,
      hi.invoice_date,
      hi.customer_name, hi.customer_vat_number, hi.customer_fiscal_code,
      hi.customer_pec, hi.customer_sdi_code,
      hi.customer_address, hi.customer_city, hi.customer_zip, hi.customer_country,
      hi.amount_subtotal, hi.amount_vat, hi.amount_total, hi.vat_pct, hi.vat_exempt_reason,
      hi.description, hi.xml_sdi_payload, hi.sdi_status, hi.sdi_submitted_at, hi.sdi_response, hi.sdi_identifier,
      hi.pdf_url,
      hi.created_at, hi.updated_at,
      jsonb_build_object('original_table', 'hospitality_invoices', 'invoice_type', hi.invoice_type, 'reservation_id', hi.reservation_id)
    FROM public.hospitality_invoices hi
    JOIN public.entities e ON e.id = hi.entity_id
    ON CONFLICT (entity_id, document_type, document_number) DO NOTHING;
  END IF;
END $$;

-- 3. b2b_invoices (restaurant)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='b2b_invoices') THEN
    INSERT INTO public.documents (
      id, tenant_id, entity_id, document_type, vertical,
      document_number, document_date,
      customer_name, customer_vat_number, customer_sdi_code,
      customer_country,
      amount_subtotal, amount_vat, amount_total, vat_pct,
      description, xml_payload, sdi_status, sdi_submitted_at, sdi_response,
      pdf_url,
      created_at, updated_at,
      metadata
    )
    SELECT
      bi.id,
      r.tenant_id,
      bi.restaurant_id,
      'b2b_invoice',
      'restaurant',
      bi.invoice_number,
      bi.invoice_date,
      bi.customer_name, bi.customer_vat_number, bi.customer_sdi_code,
      'IT',
      bi.amount_subtotal, bi.amount_vat, bi.amount_total, bi.vat_pct,
      bi.description, bi.xml_sdi_payload, bi.sdi_status, bi.sdi_submitted_at, bi.sdi_response,
      bi.pdf_url,
      bi.created_at, bi.updated_at,
      jsonb_build_object('original_table', 'b2b_invoices', 'order_id', bi.order_id)
    FROM public.b2b_invoices bi
    JOIN public.restaurants r ON r.id = bi.restaurant_id
    ON CONFLICT (entity_id, document_type, document_number) DO NOTHING;
  END IF;
END $$;

-- 4. fiscal_receipts (restaurant scontrini RT)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='fiscal_receipts') THEN
    INSERT INTO public.documents (
      id, tenant_id, entity_id, document_type, vertical,
      document_number, document_date,
      amount_total, amount_vat,
      rt_serial, rt_status, rt_payload, rt_response,
      lottery_code, lottery_status,
      ade_submission_id,
      created_at, updated_at,
      metadata
    )
    SELECT
      fr.id,
      r.tenant_id,
      fr.restaurant_id,
      'fiscal_receipt',
      'restaurant',
      COALESCE(fr.receipt_number, 'RCT-' || substring(fr.id::text, 1, 8)),
      fr.fiscal_date,
      fr.amount_total, fr.vat_total,
      fr.rt_serial, fr.rt_status, fr.rt_payload, fr.rt_response,
      fr.lottery_code, fr.lottery_status,
      NULL,
      fr.created_at, fr.updated_at,
      jsonb_build_object('original_table', 'fiscal_receipts', 'order_id', fr.order_id, 'ade_status', fr.ade_submission_status)
    FROM public.fiscal_receipts fr
    JOIN public.restaurants r ON r.id = fr.restaurant_id
    ON CONFLICT (entity_id, document_type, document_number) DO NOTHING;
  END IF;
END $$;

-- 5. ade_daily_submissions (corrispettivi giornalieri)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='ade_daily_submissions') THEN
    INSERT INTO public.documents (
      id, tenant_id, entity_id, document_type, vertical,
      document_number, document_date,
      amount_total, amount_vat,
      xml_payload, sdi_response,
      sdi_status,
      created_at, updated_at,
      metadata
    )
    SELECT
      ads.id,
      r.tenant_id,
      ads.restaurant_id,
      'ade_corrispettivi',
      'restaurant',
      'ADE-' || ads.submission_date::TEXT,
      ads.submission_date,
      ads.total_amount, ads.total_vat,
      ads.xml_payload, ads.ade_response,
      CASE
        WHEN ads.status = 'accepted' THEN 'accepted'
        WHEN ads.status = 'submitted' THEN 'submitted'
        WHEN ads.status = 'rejected' THEN 'rejected'
        ELSE 'draft'
      END,
      ads.created_at, ads.updated_at,
      jsonb_build_object('original_table', 'ade_daily_submissions', 'attempts', ads.attempts, 'receipts_count', ads.receipts_count)
    FROM public.ade_daily_submissions ads
    JOIN public.restaurants r ON r.id = ads.restaurant_id
    ON CONFLICT (entity_id, document_type, document_number) DO NOTHING;
  END IF;
END $$;

-- ============================================================================
-- VIEWS backward-compat (le vecchie API continuano a funzionare)
-- Nota: SOLO views read-only, write tramite documents diretto
-- ============================================================================

CREATE OR REPLACE VIEW public.v_documents_hospitality_invoices
WITH (security_invoker = true) AS
SELECT
  id, entity_id, document_number AS invoice_number, document_date AS invoice_date,
  amount_subtotal, amount_vat, amount_total, vat_pct,
  customer_name, customer_vat_number, customer_pec, customer_sdi_code,
  sdi_status, sdi_submitted_at, xml_payload AS xml_sdi_payload,
  payment_status, paid_amount,
  created_at, updated_at
FROM public.documents
WHERE document_type = 'hospitality_invoice' AND vertical = 'hospitality';

CREATE OR REPLACE VIEW public.v_documents_fiscal_receipts
WITH (security_invoker = true) AS
SELECT
  id, entity_id AS restaurant_id, document_number AS receipt_number, document_date AS fiscal_date,
  amount_total, amount_vat AS vat_total,
  rt_serial, rt_status, rt_payload, rt_response,
  lottery_code, lottery_status,
  created_at, updated_at
FROM public.documents
WHERE document_type = 'fiscal_receipt' AND vertical = 'restaurant';

GRANT SELECT ON public.v_documents_hospitality_invoices TO authenticated;
GRANT SELECT ON public.v_documents_fiscal_receipts TO authenticated;
