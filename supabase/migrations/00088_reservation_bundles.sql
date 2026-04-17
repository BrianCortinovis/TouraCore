-- 00088: Reservation bundles (carrello multi-vertical) + saga fulfillment
--
-- Un bundle = 1 guest + N items cross-vertical (hospitality + restaurant + experience + bike + ...)
-- 1 Stripe PaymentIntent con transfer_data[] split automatico ai connected accounts delle legal_entities.
-- Saga pattern: fulfillment ordinato con stato tracciato per crash recovery.

CREATE TABLE IF NOT EXISTS public.reservation_bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  guest_profile_id UUID NOT NULL REFERENCES public.guest_profiles(id) ON DELETE RESTRICT,

  -- Riferimento opzionale cart pre-checkout (Redis/DB)
  cart_id UUID,

  -- Stato bundle (state machine)
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',            -- creato, non ancora pagato
    'payment_processing', -- PaymentIntent inviato, aspetto conferma
    'paid',               -- Stripe charge.succeeded
    'fulfilling',         -- saga in corso (creo reservations child)
    'confirmed',          -- tutti child creati OK
    'partial_cancelled',  -- qualche item cancellato
    'cancelled',          -- tutto cancellato pre-conferma
    'refunded',           -- refund post-conferma
    'expired',            -- timeout (carrello abbandonato)
    'failed'              -- saga fallita irrimediabilmente
  )),

  -- Payment
  currency CHAR(3) NOT NULL DEFAULT 'EUR',
  total_amount_cents BIGINT NOT NULL DEFAULT 0,
  subtotal_cents BIGINT NOT NULL DEFAULT 0,
  tax_cents BIGINT NOT NULL DEFAULT 0,
  discount_cents BIGINT NOT NULL DEFAULT 0,
  platform_fee_cents BIGINT NOT NULL DEFAULT 0,

  stripe_payment_intent_id TEXT UNIQUE,
  stripe_charge_id TEXT,
  stripe_customer_id TEXT,
  payment_method_type TEXT,
  paid_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,

  -- Policy cancellazione bundle-level (fallback, singoli item possono avere policy propria)
  cancellation_policy JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Attribution
  source TEXT DEFAULT 'direct' CHECK (source IN ('direct','ota','agency','widget','api','staff')),
  source_ref TEXT, -- es. channel ID se OTA
  referral_code TEXT,
  promo_code TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,

  -- Locale + trace
  locale TEXT DEFAULT 'it',
  client_ip INET,
  user_agent TEXT,

  -- Saga state (per crash recovery)
  saga_state JSONB NOT NULL DEFAULT '{
    "items_created": [],
    "items_failed": [],
    "documents_emitted": [],
    "compensations_applied": [],
    "last_error": null
  }'::jsonb,
  saga_attempts INT NOT NULL DEFAULT 0,
  last_saga_error TEXT,
  last_saga_at TIMESTAMPTZ,

  -- Timing
  expires_at TIMESTAMPTZ, -- timeout carrello
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancelled_by TEXT,
  cancel_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_bundles_tenant ON public.reservation_bundles(tenant_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bundles_guest ON public.reservation_bundles(guest_profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bundles_stripe_pi ON public.reservation_bundles(stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bundles_pending ON public.reservation_bundles(tenant_id) WHERE status IN ('pending','payment_processing','fulfilling');

-- ============================================================================
-- Bundle items — child cross-vertical
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.reservation_bundle_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id UUID NOT NULL REFERENCES public.reservation_bundles(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  legal_entity_id UUID NOT NULL REFERENCES public.legal_entities(id) ON DELETE RESTRICT,
  entity_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE RESTRICT,

  -- Vertical
  item_type TEXT NOT NULL CHECK (item_type IN (
    'hospitality',      -- reservation (notte+stanza)
    'restaurant',       -- restaurant_reservation (tavolo+ora)
    'experience',       -- activity_booking (slot tour)
    'bike_rental',
    'wellness',
    'moto_rental',
    'ski_school',
    'addon'             -- upsell generico (transfer, parcheggio, ecc)
  )),

  -- Resource config (poly) — JSON con config richiesta vertical
  config JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Fulfillment result (dopo saga)
  child_ref_table TEXT, -- 'reservations','restaurant_reservations','activity_bookings', ecc
  child_ref_id UUID,    -- ID record child creato
  fulfillment_status TEXT NOT NULL DEFAULT 'pending' CHECK (fulfillment_status IN (
    'pending','locked','created','failed','cancelled','refunded'
  )),
  fulfillment_error TEXT,
  fulfilled_at TIMESTAMPTZ,

  -- Pricing
  quantity INT NOT NULL DEFAULT 1,
  unit_price_cents BIGINT NOT NULL,
  subtotal_cents BIGINT NOT NULL,
  vat_rate NUMERIC(5,2) NOT NULL DEFAULT 0, -- 22.00/10.00/5.00/0.00
  vat_cents BIGINT NOT NULL DEFAULT 0,
  discount_cents BIGINT NOT NULL DEFAULT 0,
  total_cents BIGINT NOT NULL,

  -- Payout split
  stripe_transfer_id TEXT,
  stripe_transfer_amount_cents BIGINT,
  platform_fee_cents BIGINT DEFAULT 0,

  -- Fiscal emission
  fiscal_document_id UUID, -- FK soft a documents dopo emissione
  fiscal_emitter_type TEXT CHECK (fiscal_emitter_type IN (
    'locazione_turistica','cedolare_secca','fiscal_receipt_rt','sdi_invoice','sdi_forfettario','prestazione_occasionale','cortesia'
  )),
  fiscal_emitted_at TIMESTAMPTZ,
  fiscal_error TEXT,

  -- Policy cancellazione per item (override bundle-level)
  cancellation_policy JSONB DEFAULT NULL,

  -- Order
  sort_order INT NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bundle_items_bundle ON public.reservation_bundle_items(bundle_id);
CREATE INDEX IF NOT EXISTS idx_bundle_items_legal_entity ON public.reservation_bundle_items(legal_entity_id, fulfilled_at);
CREATE INDEX IF NOT EXISTS idx_bundle_items_entity ON public.reservation_bundle_items(entity_id);
CREATE INDEX IF NOT EXISTS idx_bundle_items_fulfillment ON public.reservation_bundle_items(fulfillment_status) WHERE fulfillment_status IN ('pending','locked','failed');

-- ============================================================================
-- RLS
-- ============================================================================

ALTER TABLE public.reservation_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservation_bundle_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bundles_select" ON public.reservation_bundles
  FOR SELECT USING (
    tenant_id = ANY(get_user_tenant_ids())
    OR is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM agency_tenant_links atl
      WHERE atl.tenant_id = reservation_bundles.tenant_id
        AND atl.agency_id = ANY(get_user_agency_ids())
        AND atl.status = 'active'
    )
  );

CREATE POLICY "bundles_insert" ON public.reservation_bundles
  FOR INSERT WITH CHECK (tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin());

CREATE POLICY "bundles_update" ON public.reservation_bundles
  FOR UPDATE USING (tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin());

CREATE POLICY "bundles_delete" ON public.reservation_bundles
  FOR DELETE USING (is_platform_admin());

CREATE POLICY "bundle_items_select" ON public.reservation_bundle_items
  FOR SELECT USING (
    tenant_id = ANY(get_user_tenant_ids())
    OR is_platform_admin()
  );

CREATE POLICY "bundle_items_insert" ON public.reservation_bundle_items
  FOR INSERT WITH CHECK (tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin());

CREATE POLICY "bundle_items_update" ON public.reservation_bundle_items
  FOR UPDATE USING (tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin());

CREATE POLICY "bundle_items_delete" ON public.reservation_bundle_items
  FOR DELETE USING (is_platform_admin());

DROP TRIGGER IF EXISTS set_bundles_updated_at ON public.reservation_bundles;
CREATE TRIGGER set_bundles_updated_at BEFORE UPDATE ON public.reservation_bundles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS set_bundle_items_updated_at ON public.reservation_bundle_items;
CREATE TRIGGER set_bundle_items_updated_at BEFORE UPDATE ON public.reservation_bundle_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- Audit log immutable
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.bundle_audit_log (
  id BIGSERIAL PRIMARY KEY,
  bundle_id UUID NOT NULL REFERENCES public.reservation_bundles(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('guest','system','staff','webhook','admin')),
  actor_id TEXT,
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bundle_audit_bundle ON public.bundle_audit_log(bundle_id, created_at);

ALTER TABLE public.bundle_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bundle_audit_select" ON public.bundle_audit_log
  FOR SELECT USING (
    tenant_id = ANY(get_user_tenant_ids())
    OR is_platform_admin()
  );

CREATE POLICY "bundle_audit_insert" ON public.bundle_audit_log
  FOR INSERT WITH CHECK (
    tenant_id = ANY(get_user_tenant_ids())
    OR is_platform_admin()
  );

-- ============================================================================
-- Helpers
-- ============================================================================

CREATE OR REPLACE FUNCTION public.bundle_recalc_totals(p_bundle_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE reservation_bundles b
  SET
    subtotal_cents = COALESCE((SELECT SUM(subtotal_cents) FROM reservation_bundle_items WHERE bundle_id = p_bundle_id), 0),
    tax_cents = COALESCE((SELECT SUM(vat_cents) FROM reservation_bundle_items WHERE bundle_id = p_bundle_id), 0),
    discount_cents = COALESCE((SELECT SUM(discount_cents) FROM reservation_bundle_items WHERE bundle_id = p_bundle_id), 0),
    total_amount_cents = COALESCE((SELECT SUM(total_cents) FROM reservation_bundle_items WHERE bundle_id = p_bundle_id), 0),
    updated_at = NOW()
  WHERE b.id = p_bundle_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.bundle_recalc_totals TO authenticated, service_role;

-- Trigger auto-recalc su bundle_items change
CREATE OR REPLACE FUNCTION public.bundle_items_recalc_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  PERFORM bundle_recalc_totals(COALESCE(NEW.bundle_id, OLD.bundle_id));
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS bundle_items_recalc ON public.reservation_bundle_items;
CREATE TRIGGER bundle_items_recalc
  AFTER INSERT OR UPDATE OR DELETE ON public.reservation_bundle_items
  FOR EACH ROW EXECUTE FUNCTION public.bundle_items_recalc_trigger();

-- Aggiorna guest lifetime stats on bundle confirmed
CREATE OR REPLACE FUNCTION public.guest_profile_update_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed') THEN
    UPDATE guest_profiles
    SET
      total_bookings = total_bookings + 1,
      total_spend_cents = total_spend_cents + NEW.total_amount_cents,
      first_booking_at = COALESCE(first_booking_at, NEW.confirmed_at, NOW()),
      last_booking_at = NEW.confirmed_at
    WHERE id = NEW.guest_profile_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guest_profile_stats_on_bundle ON public.reservation_bundles;
CREATE TRIGGER guest_profile_stats_on_bundle
  AFTER UPDATE ON public.reservation_bundles
  FOR EACH ROW EXECUTE FUNCTION public.guest_profile_update_stats();

COMMENT ON TABLE public.reservation_bundles IS 'Carrello multi-vertical con saga fulfillment + Stripe Connect split.';
COMMENT ON TABLE public.reservation_bundle_items IS 'Item cross-vertical dentro bundle. Ogni item → 1 legal_entity emittente + 1 record child (reservations/restaurant_reservations/ecc).';
