-- 00037: Fatturazione — fatture, righe, pagamenti
-- Dipende da: 00028 (entities), 00033 (guests)
-- Nota: sostituisce la tabella invoices creata in 00021_billing (schema semplificato Stripe)
-- con una versione completa per fatturazione ospiti entity-scoped.

-- ============================================================================
-- 0. DROP VECCHIA TABELLA INVOICES (00021_billing — schema Stripe semplificato)
-- ============================================================================

DROP POLICY IF EXISTS "invoices_select" ON invoices;
DROP INDEX IF EXISTS idx_invoices_tenant;
DROP TABLE IF EXISTS invoices CASCADE;

-- ============================================================================
-- 1. TABELLA FATTURE
-- ============================================================================

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  reservation_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  guest_id UUID REFERENCES guests(id) ON DELETE SET NULL,
  invoice_type TEXT NOT NULL DEFAULT 'invoice'
    CHECK (invoice_type IN ('invoice', 'credit_note', 'receipt', 'proforma', 'corrispettivo')),
  invoice_number TEXT NOT NULL,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  customer_name TEXT NOT NULL,
  customer_vat TEXT,
  customer_fiscal_code TEXT,
  customer_address TEXT,
  customer_city TEXT,
  customer_province TEXT,
  customer_zip TEXT,
  customer_country TEXT NOT NULL DEFAULT 'IT',
  customer_sdi_code TEXT,
  customer_pec TEXT,
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_vat DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  payment_method TEXT CHECK (payment_method IN ('cash', 'credit_card', 'debit_card', 'bank_transfer', 'pos', 'online', 'check')),
  payment_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'paid', 'partial', 'refunded', 'overdue')),
  payment_terms TEXT,
  sdi_status TEXT NOT NULL DEFAULT 'draft'
    CHECK (sdi_status IN ('draft', 'ready', 'sent', 'delivered', 'accepted', 'rejected', 'error')),
  sdi_identifier TEXT,
  xml_content TEXT,
  xml_signed_url TEXT,
  pdf_url TEXT,
  original_invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  notes TEXT,
  internal_notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(entity_id, invoice_number)
);

-- ============================================================================
-- 2. RIGHE FATTURA
-- ============================================================================

CREATE TABLE invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity DECIMAL(10,3) NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  vat_rate DECIMAL(5,2) NOT NULL DEFAULT 22.00,
  vat_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- ============================================================================
-- 3. PAGAMENTI
-- ============================================================================

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  reservation_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  guest_id UUID REFERENCES guests(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'credit_card', 'debit_card', 'bank_transfer', 'pos', 'online', 'check')),
  stripe_payment_id TEXT,
  stripe_charge_id TEXT,
  gateway_type TEXT,
  gateway_payment_id TEXT,
  gateway_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  description TEXT,
  reference_number TEXT,
  notes TEXT,
  is_refund BOOLEAN NOT NULL DEFAULT false,
  original_payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 4. FUNZIONE NUMERAZIONE AUTOMATICA
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_invoice_number(p_entity_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_prefix TEXT;
  v_next_num INTEGER;
  v_year TEXT;
  v_number TEXT;
BEGIN
  SELECT invoice_prefix, invoice_next_number
  INTO v_prefix, v_next_num
  FROM accommodations
  WHERE entity_id = p_entity_id
  FOR UPDATE;

  IF v_next_num IS NULL THEN
    v_next_num := 1;
  END IF;

  v_year := TO_CHAR(CURRENT_DATE, 'YYYY');

  IF v_prefix IS NOT NULL AND v_prefix != '' THEN
    v_number := v_prefix || '-' || v_year || '-' || LPAD(v_next_num::TEXT, 4, '0');
  ELSE
    v_number := 'F-' || v_year || '-' || LPAD(v_next_num::TEXT, 4, '0');
  END IF;

  UPDATE accommodations
  SET invoice_next_number = v_next_num + 1
  WHERE entity_id = p_entity_id;

  RETURN v_number;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. INDICI
-- ============================================================================

CREATE INDEX idx_invoices_entity ON invoices(entity_id);
CREATE INDEX idx_invoices_guest ON invoices(guest_id);
CREATE INDEX idx_invoices_reservation ON invoices(reservation_id);
CREATE INDEX idx_invoices_date ON invoices(entity_id, invoice_date DESC);
CREATE INDEX idx_invoices_status ON invoices(entity_id, payment_status);
CREATE INDEX idx_invoice_items_invoice ON invoice_items(invoice_id);
CREATE INDEX idx_payments_entity ON payments(entity_id);
CREATE INDEX idx_payments_invoice ON payments(invoice_id);
CREATE INDEX idx_payments_reservation ON payments(reservation_id);

-- ============================================================================
-- 6. RLS — entity-scoped
-- ============================================================================

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- invoices
CREATE POLICY "inv_select" ON invoices FOR SELECT USING (entity_id = ANY(get_user_entity_ids()));
CREATE POLICY "inv_insert" ON invoices FOR INSERT WITH CHECK (entity_id = ANY(get_user_entity_ids()));
CREATE POLICY "inv_update" ON invoices FOR UPDATE USING (entity_id = ANY(get_user_entity_ids()));
CREATE POLICY "inv_delete" ON invoices FOR DELETE USING (entity_id = ANY(get_user_entity_ids()));

-- invoice_items (via invoice ownership)
CREATE POLICY "ii_select" ON invoice_items FOR SELECT USING (
  invoice_id IN (SELECT id FROM invoices WHERE entity_id = ANY(get_user_entity_ids()))
);
CREATE POLICY "ii_insert" ON invoice_items FOR INSERT WITH CHECK (
  invoice_id IN (SELECT id FROM invoices WHERE entity_id = ANY(get_user_entity_ids()))
);
CREATE POLICY "ii_update" ON invoice_items FOR UPDATE USING (
  invoice_id IN (SELECT id FROM invoices WHERE entity_id = ANY(get_user_entity_ids()))
);
CREATE POLICY "ii_delete" ON invoice_items FOR DELETE USING (
  invoice_id IN (SELECT id FROM invoices WHERE entity_id = ANY(get_user_entity_ids()))
);

-- payments
CREATE POLICY "pay_select" ON payments FOR SELECT USING (entity_id = ANY(get_user_entity_ids()));
CREATE POLICY "pay_insert" ON payments FOR INSERT WITH CHECK (entity_id = ANY(get_user_entity_ids()));
CREATE POLICY "pay_update" ON payments FOR UPDATE USING (entity_id = ANY(get_user_entity_ids()));
CREATE POLICY "pay_delete" ON payments FOR DELETE USING (entity_id = ANY(get_user_entity_ids()));
