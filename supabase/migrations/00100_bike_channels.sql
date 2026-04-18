-- 00100: Bike rental channel manager — OTA distribution tables
-- Dipende da: 00093-00099
-- Modulo: Bike Rental M046 channel manager

-- =============================================================================
-- bike_channel_connections — connessione a provider OTA/middleware
-- =============================================================================
CREATE TABLE public.bike_channel_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bike_rental_id UUID NOT NULL REFERENCES public.bike_rentals(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN (
    'bokun','rezdy','octo_ventrata','getyourguide','viator','fareharbor',
    'checkfront','regiondo','listnride','civitatis','klook','musement',
    'tiqets','headout','bikesbooking','komoot','bikemap'
  )),
  provider_product_id TEXT,
  provider_supplier_id TEXT,
  provider_credentials JSONB NOT NULL DEFAULT '{}'::jsonb,
  integration_mode TEXT NOT NULL DEFAULT 'push_pull' CHECK (integration_mode IN ('push_pull','webhook','polling','passive')),
  sync_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  commission_rate NUMERIC(5,2) CHECK (commission_rate IS NULL OR (commission_rate >= 0 AND commission_rate <= 100)),
  commission_included_in_price BOOLEAN NOT NULL DEFAULT FALSE,
  pricing_strategy TEXT NOT NULL DEFAULT 'parity' CHECK (pricing_strategy IN ('parity','markup','markdown','custom')),
  pricing_adjustment NUMERIC(5,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  cutoff_minutes INT NOT NULL DEFAULT 60 CHECK (cutoff_minutes >= 0),
  last_availability_push_at TIMESTAMPTZ,
  last_booking_pull_at TIMESTAMPTZ,
  last_sync_status TEXT,
  last_sync_error TEXT,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (bike_rental_id, provider, provider_product_id)
);

CREATE INDEX idx_bike_chan_conn_tenant ON public.bike_channel_connections(tenant_id, sync_enabled);
CREATE INDEX idx_bike_chan_conn_rental ON public.bike_channel_connections(bike_rental_id);
CREATE INDEX idx_bike_chan_conn_provider ON public.bike_channel_connections(provider, sync_enabled) WHERE sync_enabled = TRUE;

ALTER TABLE public.bike_channel_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bike_chan_conn_select" ON public.bike_channel_connections FOR SELECT USING (
  tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin()
  OR EXISTS (SELECT 1 FROM public.agency_tenant_links atl WHERE atl.tenant_id = bike_channel_connections.tenant_id AND atl.agency_id = ANY(get_user_agency_ids()) AND atl.status='active')
);
CREATE POLICY "bike_chan_conn_insert" ON public.bike_channel_connections FOR INSERT WITH CHECK (tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin());
CREATE POLICY "bike_chan_conn_update" ON public.bike_channel_connections FOR UPDATE USING (tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin());
CREATE POLICY "bike_chan_conn_delete" ON public.bike_channel_connections FOR DELETE USING (tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin());

CREATE TRIGGER set_bike_chan_conn_updated_at BEFORE UPDATE ON public.bike_channel_connections FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- bike_channel_product_mappings — mapping bike_type interno → external SKU OTA
-- =============================================================================
CREATE TABLE public.bike_channel_product_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES public.bike_channel_connections(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  bike_type_id UUID NOT NULL REFERENCES public.bike_types(id) ON DELETE CASCADE,
  external_product_id TEXT NOT NULL,
  external_rate_plan_id TEXT,
  external_product_name TEXT,
  inventory_allocation INT CHECK (inventory_allocation IS NULL OR inventory_allocation >= 0),
  rate_override NUMERIC(10,2) CHECK (rate_override IS NULL OR rate_override >= 0),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (connection_id, bike_type_id)
);

CREATE INDEX idx_bike_chan_map_conn ON public.bike_channel_product_mappings(connection_id);
CREATE INDEX idx_bike_chan_map_tenant ON public.bike_channel_product_mappings(tenant_id);

ALTER TABLE public.bike_channel_product_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bike_chan_map_select" ON public.bike_channel_product_mappings FOR SELECT USING (
  tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin()
);
CREATE POLICY "bike_chan_map_insert" ON public.bike_channel_product_mappings FOR INSERT WITH CHECK (tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin());
CREATE POLICY "bike_chan_map_update" ON public.bike_channel_product_mappings FOR UPDATE USING (tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin());
CREATE POLICY "bike_chan_map_delete" ON public.bike_channel_product_mappings FOR DELETE USING (tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin());

CREATE TRIGGER set_bike_chan_map_updated_at BEFORE UPDATE ON public.bike_channel_product_mappings FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- bike_channel_bookings_inbound — bookings ricevuti da OTA (staging + dedup)
-- =============================================================================
CREATE TABLE public.bike_channel_bookings_inbound (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES public.bike_channel_connections(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  external_booking_ref TEXT NOT NULL,
  raw_payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','mapped','converted','failed','cancelled','dedup_skipped')),
  reservation_id UUID REFERENCES public.bike_rental_reservations(id) ON DELETE SET NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  UNIQUE (provider, external_booking_ref)
);

CREATE INDEX idx_bike_chan_inbound_conn ON public.bike_channel_bookings_inbound(connection_id);
CREATE INDEX idx_bike_chan_inbound_status ON public.bike_channel_bookings_inbound(status, received_at);
CREATE INDEX idx_bike_chan_inbound_tenant ON public.bike_channel_bookings_inbound(tenant_id);

ALTER TABLE public.bike_channel_bookings_inbound ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bike_chan_inbound_select" ON public.bike_channel_bookings_inbound FOR SELECT USING (
  tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin()
);
CREATE POLICY "bike_chan_inbound_insert" ON public.bike_channel_bookings_inbound FOR INSERT WITH CHECK (tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin());
CREATE POLICY "bike_chan_inbound_update" ON public.bike_channel_bookings_inbound FOR UPDATE USING (tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin());

-- =============================================================================
-- bike_channel_sync_logs — audit + troubleshooting
-- =============================================================================
CREATE TABLE public.bike_channel_sync_logs (
  id BIGSERIAL PRIMARY KEY,
  connection_id UUID REFERENCES public.bike_channel_connections(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  operation TEXT NOT NULL,
  direction TEXT CHECK (direction IN ('outbound','inbound')),
  http_status INT,
  success BOOLEAN,
  request_summary JSONB,
  response_summary JSONB,
  error_message TEXT,
  duration_ms INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bike_chan_logs_conn ON public.bike_channel_sync_logs(connection_id, created_at DESC);
CREATE INDEX idx_bike_chan_logs_tenant ON public.bike_channel_sync_logs(tenant_id, created_at DESC);
CREATE INDEX idx_bike_chan_logs_op ON public.bike_channel_sync_logs(operation, success, created_at DESC);

ALTER TABLE public.bike_channel_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bike_chan_logs_select" ON public.bike_channel_sync_logs FOR SELECT USING (
  tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin()
);
-- Insert-only by service role/backend
CREATE POLICY "bike_chan_logs_insert" ON public.bike_channel_sync_logs FOR INSERT WITH CHECK (TRUE);

-- =============================================================================
-- Extend bike_rental_reservations con campi channel
-- =============================================================================
ALTER TABLE public.bike_rental_reservations
  ADD COLUMN IF NOT EXISTS channel_connection_id UUID REFERENCES public.bike_channel_connections(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS channel_commission_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS channel_net_amount NUMERIC(12,2);

CREATE INDEX IF NOT EXISTS idx_bike_res_channel_conn ON public.bike_rental_reservations(channel_connection_id) WHERE channel_connection_id IS NOT NULL;

COMMENT ON TABLE public.bike_channel_connections IS 'OTA/channel manager connections per bike rental (Bokun/Rezdy/GYG/Viator/OCTO/bike-pure)';
COMMENT ON TABLE public.bike_channel_product_mappings IS 'Mapping bike_type interno → external SKU OTA con inventory_allocation (yield mgmt)';
COMMENT ON TABLE public.bike_channel_bookings_inbound IS 'Staging inbound bookings da OTA prima di conversione in bike_rental_reservations';
COMMENT ON TABLE public.bike_channel_sync_logs IS 'Audit log sync operations availability_push/booking_pull/webhook_recv';
