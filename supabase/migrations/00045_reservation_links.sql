-- 00045: Link FK reservation_id da bookings → reservations + upsell_orders
-- Dipende da: 00044 (reservations), 00037 (invoices/payments), 00041 (sent_messages),
--             00042 (housekeeping_tasks), 00035 (tourist_tax_records), 00021 (commission_ledger),
--             00039 (upsell_offers)

-- ============================================================================
-- 1. REPOINT FK invoices.reservation_id → reservations
-- ============================================================================

ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_reservation_id_fkey;
ALTER TABLE invoices ADD CONSTRAINT invoices_reservation_id_fkey
  FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE SET NULL;

-- ============================================================================
-- 2. REPOINT FK payments.reservation_id → reservations
-- ============================================================================

ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_reservation_id_fkey;
ALTER TABLE payments ADD CONSTRAINT payments_reservation_id_fkey
  FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE SET NULL;

-- ============================================================================
-- 3. REPOINT FK sent_messages.reservation_id → reservations
-- ============================================================================

ALTER TABLE sent_messages DROP CONSTRAINT IF EXISTS sent_messages_reservation_id_fkey;
ALTER TABLE sent_messages ADD CONSTRAINT sent_messages_reservation_id_fkey
  FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE SET NULL;

-- ============================================================================
-- 4. REPOINT FK tourist_tax_records.reservation_id → reservations
-- ============================================================================

ALTER TABLE tourist_tax_records DROP CONSTRAINT IF EXISTS tourist_tax_records_reservation_id_fkey;
ALTER TABLE tourist_tax_records ADD CONSTRAINT tourist_tax_records_reservation_id_fkey
  FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE;

-- ============================================================================
-- 5. ADD reservation_id a housekeeping_tasks (nullable)
-- ============================================================================

ALTER TABLE housekeeping_tasks ADD COLUMN reservation_id UUID
  REFERENCES reservations(id) ON DELETE SET NULL;
CREATE INDEX idx_housekeeping_reservation ON housekeeping_tasks(reservation_id)
  WHERE reservation_id IS NOT NULL;

-- ============================================================================
-- 6. UPSELL_ORDERS — ordini upsell legati a prenotazione
-- ============================================================================

CREATE TABLE upsell_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  upsell_offer_id UUID NOT NULL REFERENCES upsell_offers(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 1),
  unit_price NUMERIC(10, 2) NOT NULL,
  total NUMERIC(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'delivered', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE upsell_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "uo_select" ON upsell_orders
  FOR SELECT USING (entity_id = ANY(get_user_entity_ids()));
CREATE POLICY "uo_insert" ON upsell_orders
  FOR INSERT WITH CHECK (entity_id = ANY(get_user_entity_ids()));
CREATE POLICY "uo_update" ON upsell_orders
  FOR UPDATE USING (entity_id = ANY(get_user_entity_ids()));
CREATE POLICY "uo_delete" ON upsell_orders
  FOR DELETE USING (entity_id = ANY(get_user_entity_ids()));

CREATE INDEX idx_upsell_orders_entity ON upsell_orders(entity_id);
CREATE INDEX idx_upsell_orders_reservation ON upsell_orders(reservation_id);
CREATE INDEX idx_upsell_orders_offer ON upsell_orders(upsell_offer_id);

CREATE TRIGGER set_upsell_orders_updated_at
  BEFORE UPDATE ON upsell_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- 7. AGGIORNA financial_view per usare reservations invece di bookings
-- ============================================================================

DROP VIEW IF EXISTS v_financial_summary;

CREATE OR REPLACE VIEW v_financial_summary AS
SELECT
  i.entity_id,
  i.id AS invoice_id,
  i.invoice_number,
  i.invoice_date,
  i.invoice_type,
  i.customer_name,
  i.subtotal,
  i.total_vat,
  i.total,
  i.payment_status,
  i.sdi_status,
  i.reservation_id,
  r.reservation_code,
  r.guest_id,
  g.first_name || ' ' || g.last_name AS guest_name,
  COALESCE(
    (SELECT SUM(p.amount) FROM payments p
     WHERE p.invoice_id = i.id AND p.is_refund = false),
    0
  ) AS total_paid,
  COALESCE(
    (SELECT SUM(p.amount) FROM payments p
     WHERE p.invoice_id = i.id AND p.is_refund = true),
    0
  ) AS total_refunded
FROM invoices i
LEFT JOIN reservations r ON i.reservation_id = r.id
LEFT JOIN guests g ON r.guest_id = g.id;

GRANT SELECT ON v_financial_summary TO authenticated;
