-- 00016: Tabella bookings — primitive prenotazione condivise
-- Dipende da: tenants (00002), get_user_tenant_ids() (00001)

CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  portal_id UUID,
  vertical TEXT NOT NULL DEFAULT 'hospitality',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'canceled', 'completed', 'no_show')),
  guest_name TEXT NOT NULL,
  guest_email TEXT NOT NULL,
  guest_phone TEXT,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  commission_amount NUMERIC(12, 2) DEFAULT 0,
  commission_rate NUMERIC(5, 4) DEFAULT 0,
  notes TEXT,
  vertical_data JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  source TEXT NOT NULL DEFAULT 'direct'
    CHECK (source IN ('direct', 'portal', 'widget', 'api')),
  stripe_payment_intent_id TEXT,
  canceled_at TIMESTAMPTZ,
  canceled_reason TEXT,
  confirmed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bookings_select" ON bookings
  FOR SELECT USING (tenant_id = ANY(get_user_tenant_ids()));

CREATE POLICY "bookings_insert" ON bookings
  FOR INSERT WITH CHECK (tenant_id = ANY(get_user_tenant_ids()));

CREATE POLICY "bookings_update" ON bookings
  FOR UPDATE USING (tenant_id = ANY(get_user_tenant_ids()));

CREATE POLICY "bookings_delete" ON bookings
  FOR DELETE USING (tenant_id = ANY(get_user_tenant_ids()));

CREATE INDEX idx_bookings_tenant ON bookings(tenant_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_dates ON bookings(check_in, check_out);
CREATE INDEX idx_bookings_guest ON bookings(guest_email);
CREATE INDEX idx_bookings_source ON bookings(source);
CREATE INDEX idx_bookings_created ON bookings(created_at DESC);
CREATE INDEX idx_bookings_portal ON bookings(portal_id) WHERE portal_id IS NOT NULL;

CREATE TRIGGER set_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Constraint: check_out deve essere dopo check_in
ALTER TABLE bookings ADD CONSTRAINT bookings_dates_check
  CHECK (check_out > check_in);
