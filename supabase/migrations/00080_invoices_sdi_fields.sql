-- 00080: Add SDI fields to existing invoices table (hospitality)

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS sdi_xml_payload TEXT,
  ADD COLUMN IF NOT EXISTS sdi_status TEXT DEFAULT 'draft'
    CHECK (sdi_status IN ('draft','submitted','accepted','rejected','partial_accept','expired')),
  ADD COLUMN IF NOT EXISTS sdi_submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sdi_response TEXT,
  ADD COLUMN IF NOT EXISTS customer_pec TEXT,
  ADD COLUMN IF NOT EXISTS customer_sdi_code TEXT;

CREATE INDEX IF NOT EXISTS idx_invoices_sdi_status ON public.invoices(entity_id, sdi_status);
