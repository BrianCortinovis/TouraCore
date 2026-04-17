-- 00055: Competitive hospitality expansion
-- Cover M015 S05-S06 inbox, M016 reviews+portal, M017 analytics+maintenance,
-- M018 promotions+upsell_orders+locks, M019 mobile+guidebook, M020 marketplace

-- ============================================================================
-- M015: MESSAGING INBOX 2-WAY
-- ============================================================================
CREATE TABLE IF NOT EXISTS message_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
  reservation_id UUID REFERENCES reservations(id) ON DELETE SET NULL,
  guest_id UUID REFERENCES guests(id) ON DELETE SET NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email','sms','whatsapp','booking','airbnb','portal','web','other')),
  external_thread_id TEXT,
  subject TEXT,
  is_resolved BOOLEAN DEFAULT false,
  last_message_at TIMESTAMPTZ,
  unread_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, channel, external_thread_id)
);

CREATE INDEX IF NOT EXISTS idx_message_threads_entity ON message_threads(entity_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_threads_reservation ON message_threads(reservation_id);
CREATE INDEX IF NOT EXISTS idx_message_threads_guest ON message_threads(guest_id);

ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "message_threads_select" ON message_threads FOR SELECT USING (tenant_id = ANY(get_user_tenant_ids()));
CREATE POLICY "message_threads_insert" ON message_threads FOR INSERT WITH CHECK (tenant_id = ANY(get_user_tenant_ids()));
CREATE POLICY "message_threads_update" ON message_threads FOR UPDATE USING (tenant_id = ANY(get_user_tenant_ids()));
CREATE POLICY "message_threads_delete" ON message_threads FOR DELETE USING (tenant_id = ANY(get_user_tenant_ids()));

CREATE TABLE IF NOT EXISTS inbound_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('inbound','outbound')),
  channel TEXT NOT NULL,
  external_message_id TEXT,
  from_name TEXT,
  from_identifier TEXT,
  body TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  read_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ DEFAULT NOW(),
  delivery_status TEXT DEFAULT 'received' CHECK (delivery_status IN ('queued','sent','delivered','failed','received','bounced')),
  delivery_error TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inbound_messages_thread ON inbound_messages(thread_id, received_at DESC);

ALTER TABLE inbound_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inbound_messages_all" ON inbound_messages FOR ALL
  USING (thread_id IN (SELECT id FROM message_threads WHERE tenant_id = ANY(get_user_tenant_ids())))
  WITH CHECK (thread_id IN (SELECT id FROM message_threads WHERE tenant_id = ANY(get_user_tenant_ids())));

CREATE TABLE IF NOT EXISTS quick_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
  shortcut TEXT NOT NULL,
  body TEXT NOT NULL,
  language TEXT DEFAULT 'it',
  usage_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, shortcut, language)
);

ALTER TABLE quick_replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quick_replies_all" ON quick_replies FOR ALL
  USING (tenant_id = ANY(get_user_tenant_ids()))
  WITH CHECK (tenant_id = ANY(get_user_tenant_ids()));

-- ============================================================================
-- M016: REVIEWS + GUEST PORTAL
-- ============================================================================
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  reservation_id UUID REFERENCES reservations(id) ON DELETE SET NULL,
  guest_id UUID REFERENCES guests(id) ON DELETE SET NULL,
  source TEXT NOT NULL CHECK (source IN ('direct','google','tripadvisor','booking','airbnb','expedia','other')),
  external_id TEXT,
  reviewer_name TEXT,
  reviewer_country TEXT,
  rating NUMERIC(3,2) CHECK (rating >= 0 AND rating <= 10),
  rating_scale NUMERIC(3,1) DEFAULT 10.0,
  title TEXT,
  body TEXT,
  language TEXT,
  published_at TIMESTAMPTZ,
  sentiment TEXT CHECK (sentiment IN ('positive','neutral','negative')),
  sentiment_score NUMERIC(4,3),
  topics TEXT[] DEFAULT ARRAY[]::TEXT[],
  response_body TEXT,
  response_published_at TIMESTAMPTZ,
  response_author UUID REFERENCES auth.users(id),
  is_flagged BOOLEAN DEFAULT false,
  raw_payload JSONB DEFAULT '{}'::jsonb,
  ingested_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, source, external_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_entity_published ON reviews(entity_id, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_sentiment ON reviews(sentiment) WHERE sentiment IS NOT NULL;

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews_select" ON reviews FOR SELECT USING (tenant_id = ANY(get_user_tenant_ids()));
CREATE POLICY "reviews_insert" ON reviews FOR INSERT WITH CHECK (tenant_id = ANY(get_user_tenant_ids()));
CREATE POLICY "reviews_update" ON reviews FOR UPDATE USING (tenant_id = ANY(get_user_tenant_ids()));
CREATE POLICY "reviews_delete" ON reviews FOR DELETE USING (tenant_id = ANY(get_user_tenant_ids()));

CREATE TABLE IF NOT EXISTS review_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  sent_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  review_id UUID REFERENCES reviews(id) ON DELETE SET NULL,
  token TEXT UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE review_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "review_requests_all" ON review_requests FOR ALL
  USING (reservation_id IN (SELECT id FROM reservations WHERE entity_id = ANY(get_user_entity_ids())))
  WITH CHECK (reservation_id IN (SELECT id FROM reservations WHERE entity_id = ANY(get_user_entity_ids())));

-- Guest portal tokens
CREATE TABLE IF NOT EXISTS guest_portal_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  guest_id UUID REFERENCES guests(id) ON DELETE SET NULL,
  token TEXT UNIQUE NOT NULL DEFAULT replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  use_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_guest_portal_tokens_reservation ON guest_portal_tokens(reservation_id);
ALTER TABLE guest_portal_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "guest_portal_tokens_admin" ON guest_portal_tokens FOR ALL
  USING (reservation_id IN (SELECT id FROM reservations WHERE entity_id = ANY(get_user_entity_ids())))
  WITH CHECK (reservation_id IN (SELECT id FROM reservations WHERE entity_id = ANY(get_user_entity_ids())));

-- ============================================================================
-- M017: ANALYTICS + MAINTENANCE + SUPPLIES
-- ============================================================================
CREATE TABLE IF NOT EXISTS maintenance_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
  ticket_code TEXT,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT CHECK (category IN ('plumbing','electrical','hvac','furniture','appliance','cleaning','safety','other')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open','in_progress','waiting_parts','done','cancelled')),
  assigned_to UUID REFERENCES auth.users(id),
  reported_by UUID REFERENCES auth.users(id),
  reported_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  cost_estimate NUMERIC(10,2),
  cost_actual NUMERIC(10,2),
  supplier_name TEXT,
  supplier_contact TEXT,
  photos TEXT[] DEFAULT ARRAY[]::TEXT[],
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_maintenance_tickets_entity_status ON maintenance_tickets(entity_id, status);
CREATE INDEX IF NOT EXISTS idx_maintenance_tickets_room ON maintenance_tickets(room_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_tickets_assigned ON maintenance_tickets(assigned_to);

ALTER TABLE maintenance_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "maintenance_tickets_all" ON maintenance_tickets FOR ALL
  USING (tenant_id = ANY(get_user_tenant_ids()))
  WITH CHECK (tenant_id = ANY(get_user_tenant_ids()));

CREATE TABLE IF NOT EXISTS housekeeping_checklist_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
  room_type_id UUID REFERENCES room_types(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL,
  checklist JSONB NOT NULL DEFAULT '[]'::jsonb,
  estimated_minutes INTEGER,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE housekeeping_checklist_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hk_templates_all" ON housekeeping_checklist_templates FOR ALL
  USING (tenant_id = ANY(get_user_tenant_ids()))
  WITH CHECK (tenant_id = ANY(get_user_tenant_ids()));

CREATE TABLE IF NOT EXISTS supplies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT,
  category TEXT,
  unit TEXT DEFAULT 'pcs',
  quantity NUMERIC(10,2) DEFAULT 0,
  low_stock_threshold NUMERIC(10,2) DEFAULT 0,
  cost_per_unit NUMERIC(10,2),
  last_restocked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE supplies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "supplies_all" ON supplies FOR ALL
  USING (tenant_id = ANY(get_user_tenant_ids()))
  WITH CHECK (tenant_id = ANY(get_user_tenant_ids()));

CREATE TABLE IF NOT EXISTS supply_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supply_id UUID NOT NULL REFERENCES supplies(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('restock','consumption','adjustment','waste')),
  quantity NUMERIC(10,2) NOT NULL,
  reason TEXT,
  reference_id UUID,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE supply_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "supply_movements_all" ON supply_movements FOR ALL
  USING (supply_id IN (SELECT id FROM supplies WHERE tenant_id = ANY(get_user_tenant_ids())))
  WITH CHECK (supply_id IN (SELECT id FROM supplies WHERE tenant_id = ANY(get_user_tenant_ids())));

-- Daily KPI view
CREATE OR REPLACE VIEW v_daily_kpi AS
SELECT
  e.tenant_id,
  r.entity_id,
  d.kpi_date,
  COUNT(DISTINCT r.id) FILTER (WHERE d.kpi_date >= r.check_in AND d.kpi_date < r.check_out AND r.status IN ('confirmed','checked_in','checked_out')) AS rooms_sold,
  (SELECT COUNT(*) FROM rooms rm WHERE rm.entity_id = r.entity_id AND rm.is_active = true) AS rooms_available,
  COALESCE(SUM(r.total_amount) FILTER (WHERE d.kpi_date = r.check_in AND r.status IN ('confirmed','checked_in','checked_out')), 0) AS daily_revenue
FROM reservations r
JOIN entities e ON e.id = r.entity_id
CROSS JOIN LATERAL generate_series(r.check_in, r.check_out - INTERVAL '1 day', INTERVAL '1 day') AS d(kpi_date)
WHERE r.status IN ('confirmed','checked_in','checked_out')
GROUP BY e.tenant_id, r.entity_id, d.kpi_date;

-- ============================================================================
-- M018: PROMOTIONS + UPSELL ORDERS + LOCKS + COMPETITOR + IDENTITY
-- ============================================================================
CREATE TABLE IF NOT EXISTS promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  promotion_type TEXT NOT NULL CHECK (promotion_type IN ('genius','early_booker','last_minute','weekly_discount','monthly_discount','mobile_rate','country_rate','promo_code','basic')),
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage','fixed_amount','free_nights')),
  discount_value NUMERIC(10,2) NOT NULL,
  min_advance_days INTEGER,
  max_advance_days INTEGER,
  min_stay_nights INTEGER,
  max_stay_nights INTEGER,
  applicable_days TEXT[],
  valid_from DATE,
  valid_to DATE,
  stay_from DATE,
  stay_to DATE,
  country_codes TEXT[],
  applicable_rate_plans UUID[],
  max_uses INTEGER,
  uses_count INTEGER DEFAULT 0,
  stacking_allowed BOOLEAN DEFAULT false,
  priority INTEGER DEFAULT 100,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_promotions_entity_active ON promotions(entity_id, is_active);
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "promotions_all" ON promotions FOR ALL
  USING (tenant_id = ANY(get_user_tenant_ids()))
  WITH CHECK (tenant_id = ANY(get_user_tenant_ids()));

CREATE TABLE IF NOT EXISTS promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id UUID NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  max_uses INTEGER,
  uses_count INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(code)
);
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "promo_codes_all" ON promo_codes FOR ALL
  USING (promotion_id IN (SELECT id FROM promotions WHERE tenant_id = ANY(get_user_tenant_ids())))
  WITH CHECK (promotion_id IN (SELECT id FROM promotions WHERE tenant_id = ANY(get_user_tenant_ids())));

CREATE TABLE IF NOT EXISTS promotion_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  promotion_id UUID NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
  promo_code_id UUID REFERENCES promo_codes(id) ON DELETE SET NULL,
  discount_applied NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE promotion_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "promotion_applications_all" ON promotion_applications FOR ALL
  USING (reservation_id IN (SELECT id FROM reservations WHERE entity_id = ANY(get_user_entity_ids())))
  WITH CHECK (reservation_id IN (SELECT id FROM reservations WHERE entity_id = ANY(get_user_entity_ids())));

-- upsell_orders already exists from 00045. Add missing columns for M018 S05
ALTER TABLE upsell_orders
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'EUR',
  ADD COLUMN IF NOT EXISTS payment_intent_id TEXT,
  ADD COLUMN IF NOT EXISTS requested_date DATE,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

-- Expand status check to support 'paid' + 'refunded' (drop/recreate constraint)
ALTER TABLE upsell_orders DROP CONSTRAINT IF EXISTS upsell_orders_status_check;
ALTER TABLE upsell_orders ADD CONSTRAINT upsell_orders_status_check
  CHECK (status IN ('pending','paid','confirmed','delivered','cancelled','refunded'));

CREATE TABLE IF NOT EXISTS smart_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('nuki','ttlock','igloohome','salto','other')),
  provider_device_id TEXT NOT NULL,
  nickname TEXT,
  is_active BOOLEAN DEFAULT true,
  last_ping_at TIMESTAMPTZ,
  battery_level INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider, provider_device_id)
);
ALTER TABLE smart_locks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "smart_locks_all" ON smart_locks FOR ALL
  USING (tenant_id = ANY(get_user_tenant_ids()))
  WITH CHECK (tenant_id = ANY(get_user_tenant_ids()));

CREATE TABLE IF NOT EXISTS lock_pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  smart_lock_id UUID NOT NULL REFERENCES smart_locks(id) ON DELETE CASCADE,
  reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  pin_code TEXT NOT NULL,
  valid_from TIMESTAMPTZ NOT NULL,
  valid_to TIMESTAMPTZ NOT NULL,
  provider_pin_id TEXT,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE lock_pins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lock_pins_all" ON lock_pins FOR ALL
  USING (reservation_id IN (SELECT id FROM reservations WHERE entity_id = ANY(get_user_entity_ids())))
  WITH CHECK (reservation_id IN (SELECT id FROM reservations WHERE entity_id = ANY(get_user_entity_ids())));

CREATE TABLE IF NOT EXISTS competitor_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  competitor_name TEXT NOT NULL,
  sample_date DATE NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'EUR',
  source TEXT DEFAULT 'manual',
  metadata JSONB DEFAULT '{}'::jsonb,
  collected_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(entity_id, competitor_name, sample_date)
);
CREATE INDEX IF NOT EXISTS idx_competitor_prices_entity_date ON competitor_prices(entity_id, sample_date DESC);
ALTER TABLE competitor_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "competitor_prices_all" ON competitor_prices FOR ALL
  USING (tenant_id = ANY(get_user_tenant_ids()))
  WITH CHECK (tenant_id = ANY(get_user_tenant_ids()));

CREATE TABLE IF NOT EXISTS identity_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  guest_id UUID REFERENCES guests(id) ON DELETE SET NULL,
  provider TEXT NOT NULL CHECK (provider IN ('stripe_identity','jumio','onfido')),
  provider_session_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','verified','rejected','cancelled')),
  verified_at TIMESTAMPTZ,
  rejected_reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE identity_verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "identity_verifications_all" ON identity_verifications FOR ALL
  USING (reservation_id IN (SELECT id FROM reservations WHERE entity_id = ANY(get_user_entity_ids())))
  WITH CHECK (reservation_id IN (SELECT id FROM reservations WHERE entity_id = ANY(get_user_entity_ids())));

-- ============================================================================
-- M019: AI GUIDEBOOK
-- ============================================================================
CREATE TABLE IF NOT EXISTS guidebooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  intro TEXT,
  is_published BOOLEAN DEFAULT false,
  language TEXT DEFAULT 'it',
  generated_by TEXT,
  generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE guidebooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "guidebooks_select_public" ON guidebooks FOR SELECT USING (is_published = true OR tenant_id = ANY(get_user_tenant_ids()));
CREATE POLICY "guidebooks_write" ON guidebooks FOR INSERT WITH CHECK (tenant_id = ANY(get_user_tenant_ids()));
CREATE POLICY "guidebooks_update" ON guidebooks FOR UPDATE USING (tenant_id = ANY(get_user_tenant_ids()));
CREATE POLICY "guidebooks_delete" ON guidebooks FOR DELETE USING (tenant_id = ANY(get_user_tenant_ids()));

CREATE TABLE IF NOT EXISTS guidebook_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guidebook_id UUID NOT NULL REFERENCES guidebooks(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('restaurant','attraction','nightlife','shopping','transport','beach','museum','activity','tip','other')),
  name TEXT NOT NULL,
  description TEXT,
  address TEXT,
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  google_place_id TEXT,
  distance_meters INTEGER,
  url TEXT,
  photo_url TEXT,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  sort_order INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_guidebook_items_guidebook ON guidebook_items(guidebook_id, sort_order);
ALTER TABLE guidebook_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "guidebook_items_select" ON guidebook_items FOR SELECT
  USING (guidebook_id IN (SELECT id FROM guidebooks WHERE is_published = true OR tenant_id = ANY(get_user_tenant_ids())));
CREATE POLICY "guidebook_items_write" ON guidebook_items FOR INSERT
  WITH CHECK (guidebook_id IN (SELECT id FROM guidebooks WHERE tenant_id = ANY(get_user_tenant_ids())));
CREATE POLICY "guidebook_items_update" ON guidebook_items FOR UPDATE
  USING (guidebook_id IN (SELECT id FROM guidebooks WHERE tenant_id = ANY(get_user_tenant_ids())));
CREATE POLICY "guidebook_items_delete" ON guidebook_items FOR DELETE
  USING (guidebook_id IN (SELECT id FROM guidebooks WHERE tenant_id = ANY(get_user_tenant_ids())));

-- ============================================================================
-- M020: ACCOUNTING + FX RATES + MARKETPLACE
-- ============================================================================
CREATE TABLE IF NOT EXISTS accounting_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('xero','quickbooks','fattura24','teamsystem','other')),
  is_active BOOLEAN DEFAULT true,
  credentials JSONB DEFAULT '{}'::jsonb,
  settings JSONB DEFAULT '{}'::jsonb,
  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT,
  last_sync_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, provider, entity_id)
);
ALTER TABLE accounting_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "accounting_connections_all" ON accounting_connections FOR ALL
  USING (tenant_id = ANY(get_user_tenant_ids()))
  WITH CHECK (tenant_id = ANY(get_user_tenant_ids()));

CREATE TABLE IF NOT EXISTS accounting_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES accounting_connections(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  external_id TEXT,
  direction TEXT CHECK (direction IN ('push','pull')),
  status TEXT NOT NULL,
  error_message TEXT,
  payload JSONB,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE accounting_sync_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "accounting_sync_logs_select" ON accounting_sync_logs FOR SELECT
  USING (connection_id IN (SELECT id FROM accounting_connections WHERE tenant_id = ANY(get_user_tenant_ids())));

CREATE TABLE IF NOT EXISTS fx_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency TEXT NOT NULL,
  quote_currency TEXT NOT NULL,
  rate NUMERIC(18,8) NOT NULL,
  rate_date DATE NOT NULL,
  source TEXT DEFAULT 'ecb',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(base_currency, quote_currency, rate_date)
);
CREATE INDEX IF NOT EXISTS idx_fx_rates_lookup ON fx_rates(base_currency, quote_currency, rate_date DESC);

CREATE TABLE IF NOT EXISTS marketplace_apps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  developer_name TEXT,
  developer_email TEXT,
  oauth_client_id TEXT UNIQUE NOT NULL,
  oauth_client_secret_hash TEXT NOT NULL,
  redirect_uris TEXT[] DEFAULT ARRAY[]::TEXT[],
  scopes TEXT[] DEFAULT ARRAY[]::TEXT[],
  webhook_url TEXT,
  webhook_secret TEXT,
  pricing_model TEXT CHECK (pricing_model IN ('free','one_time','subscription','usage_based')),
  pricing_amount NUMERIC(10,2),
  pricing_currency TEXT DEFAULT 'EUR',
  revenue_share_pct NUMERIC(4,2) DEFAULT 30,
  icon_url TEXT,
  is_published BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE marketplace_apps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "marketplace_apps_public_read" ON marketplace_apps FOR SELECT USING (is_published = true);
CREATE POLICY "marketplace_apps_admin" ON marketplace_apps FOR ALL
  USING (public.is_platform_super_admin())
  WITH CHECK (public.is_platform_super_admin());

CREATE TABLE IF NOT EXISTS marketplace_installations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  app_id UUID NOT NULL REFERENCES marketplace_apps(id) ON DELETE CASCADE,
  installed_by UUID REFERENCES auth.users(id),
  granted_scopes TEXT[] NOT NULL,
  access_token_hash TEXT,
  refresh_token_hash TEXT,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  uninstalled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, app_id)
);
ALTER TABLE marketplace_installations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "marketplace_installations_select" ON marketplace_installations FOR SELECT USING (tenant_id = ANY(get_user_tenant_ids()));
CREATE POLICY "marketplace_installations_write" ON marketplace_installations FOR ALL
  USING (tenant_id = ANY(get_user_tenant_ids()))
  WITH CHECK (tenant_id = ANY(get_user_tenant_ids()));

CREATE TABLE IF NOT EXISTS marketplace_api_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  installation_id UUID REFERENCES marketplace_installations(id) ON DELETE SET NULL,
  app_id UUID REFERENCES marketplace_apps(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER,
  scope_used TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_marketplace_api_calls_tenant_time ON marketplace_api_calls(tenant_id, created_at DESC);
ALTER TABLE marketplace_api_calls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "marketplace_api_calls_select" ON marketplace_api_calls FOR SELECT USING (tenant_id = ANY(get_user_tenant_ids()));

-- Triggers updated_at su nuove tabelle
CREATE OR REPLACE TRIGGER set_message_threads_updated_at BEFORE UPDATE ON message_threads FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER set_reviews_updated_at BEFORE UPDATE ON reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER set_maintenance_tickets_updated_at BEFORE UPDATE ON maintenance_tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER set_hk_templates_updated_at BEFORE UPDATE ON housekeeping_checklist_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER set_supplies_updated_at BEFORE UPDATE ON supplies FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER set_promotions_updated_at BEFORE UPDATE ON promotions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER set_upsell_orders_updated_at BEFORE UPDATE ON upsell_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER set_guidebooks_updated_at BEFORE UPDATE ON guidebooks FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER set_accounting_connections_updated_at BEFORE UPDATE ON accounting_connections FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER set_marketplace_apps_updated_at BEFORE UPDATE ON marketplace_apps FOR EACH ROW EXECUTE FUNCTION update_updated_at();
