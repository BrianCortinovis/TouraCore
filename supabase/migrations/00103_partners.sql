-- 00103: Partner system (affiliate + referral + commission + API access)
-- Production-grade multi-tenant. Cross-vertical (hotel/travel agent/influencer/tour operator/API B2B)
-- Sicurezza:
-- - API keys bcrypt hashed (mai plaintext), prefix + last4 visibile
-- - Scope granulari (listings:read, bookings:write, ecc)
-- - Rate limit per key via RPC
-- - Idempotency su commission creation (prevent double-attribution)
-- - RLS tenant isolation + partner self-access (own rows)
-- - HMAC signature verification per API calls

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

-- =============================================================================
-- partners — entità esterna che distribuisce/promuove tenant
-- =============================================================================
CREATE TABLE public.partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,  -- es. 'hotel-belvedere' (per URL /partner/[slug]/dashboard)
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('hotel','tour_operator','travel_agent','influencer','ota','affiliate','corporate','other')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','suspended','terminated')),
  -- Contact
  contact_email CITEXT NOT NULL,
  contact_phone TEXT,
  contact_person TEXT,
  company_name TEXT,
  company_website TEXT,
  company_vat_number TEXT,
  country TEXT DEFAULT 'IT',
  -- Linked auth user (quando partner accede al dashboard self-service)
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  -- Commission config (default)
  commission_pct_default NUMERIC(5,2) NOT NULL DEFAULT 10 CHECK (commission_pct_default >= 0 AND commission_pct_default <= 100),
  commission_per_vertical JSONB NOT NULL DEFAULT '{}'::jsonb, -- {"bike_rental": 15, "hospitality": 20}
  -- Payout config
  payout_method TEXT CHECK (payout_method IS NULL OR payout_method IN ('stripe_connect','bank_transfer','manual')),
  payout_schedule TEXT DEFAULT 'monthly' CHECK (payout_schedule IN ('weekly','monthly','quarterly','on_demand')),
  stripe_account_id TEXT,  -- Stripe Connect account
  bank_iban TEXT,
  bank_holder TEXT,
  bank_bic TEXT,
  minimum_payout_amount NUMERIC(10,2) DEFAULT 50,
  -- Terms
  accepted_terms_at TIMESTAMPTZ,
  accepted_terms_version TEXT,
  -- Metadata
  notes_internal TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, slug),
  UNIQUE (tenant_id, contact_email)
);

CREATE INDEX idx_partners_tenant ON public.partners(tenant_id);
CREATE INDEX idx_partners_status ON public.partners(tenant_id, status);
CREATE INDEX idx_partners_user ON public.partners(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_partners_email ON public.partners(contact_email);

CREATE TRIGGER set_partners_updated_at
  BEFORE UPDATE ON public.partners
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "partners_tenant_select" ON public.partners FOR SELECT USING (
  tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin()
  OR EXISTS (
    SELECT 1 FROM public.agency_tenant_links atl
    WHERE atl.tenant_id = partners.tenant_id
      AND atl.agency_id = ANY(get_user_agency_ids())
      AND atl.status = 'active'
  )
  OR user_id = auth.uid()  -- partner se stesso può leggere la sua row
);
CREATE POLICY "partners_tenant_insert" ON public.partners FOR INSERT WITH CHECK (
  tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin()
);
CREATE POLICY "partners_tenant_update" ON public.partners FOR UPDATE USING (
  tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin()
  OR user_id = auth.uid()
);
CREATE POLICY "partners_tenant_delete" ON public.partners FOR DELETE USING (
  tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin()
);

COMMENT ON TABLE public.partners IS 'External distribution partners (hotel/influencer/agency/OTA) with referral + commission config';

-- =============================================================================
-- partner_invitations — email invite con token
-- =============================================================================
CREATE TABLE public.partner_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  email CITEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_partner_inv_partner ON public.partner_invitations(partner_id);
CREATE INDEX idx_partner_inv_token ON public.partner_invitations(token) WHERE accepted_at IS NULL;

ALTER TABLE public.partner_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "partner_inv_select" ON public.partner_invitations FOR SELECT USING (
  tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin()
);
CREATE POLICY "partner_inv_insert" ON public.partner_invitations FOR INSERT WITH CHECK (
  tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin()
);
CREATE POLICY "partner_inv_update" ON public.partner_invitations FOR UPDATE USING (
  tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin()
);

-- =============================================================================
-- partner_links — codici referral trackati (URL + embed + multi-channel)
-- =============================================================================
CREATE TABLE public.partner_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,  -- human-readable short, es. 'HOTEL-BELVE-AB12'
  label TEXT,
  channel TEXT CHECK (channel IS NULL OR channel IN ('url','embed','api','social','email','print','other')),
  target_entity_id UUID REFERENCES public.entities(id) ON DELETE SET NULL,
  target_url TEXT,  -- landing custom opzionale
  -- UTM
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT,
  -- Commission override (se diverso da default partner)
  commission_pct_override NUMERIC(5,2) CHECK (commission_pct_override IS NULL OR (commission_pct_override >= 0 AND commission_pct_override <= 100)),
  -- Associated voucher (coupon dedicato per link)
  associated_credit_instrument_id UUID REFERENCES public.credit_instruments(id) ON DELETE SET NULL,
  -- Tracking
  click_count INT NOT NULL DEFAULT 0,
  conversion_count INT NOT NULL DEFAULT 0,
  last_click_at TIMESTAMPTZ,
  last_conversion_at TIMESTAMPTZ,
  -- Lifecycle
  active BOOLEAN NOT NULL DEFAULT TRUE,
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_partner_links_partner ON public.partner_links(partner_id);
CREATE INDEX idx_partner_links_tenant ON public.partner_links(tenant_id);
CREATE INDEX idx_partner_links_code ON public.partner_links(code) WHERE active = TRUE;

CREATE TRIGGER set_partner_links_updated_at
  BEFORE UPDATE ON public.partner_links
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE public.partner_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "partner_links_select" ON public.partner_links FOR SELECT USING (
  tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin()
  OR EXISTS (SELECT 1 FROM public.partners p WHERE p.id = partner_links.partner_id AND p.user_id = auth.uid())
);
CREATE POLICY "partner_links_insert" ON public.partner_links FOR INSERT WITH CHECK (
  tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin()
);
CREATE POLICY "partner_links_update" ON public.partner_links FOR UPDATE USING (
  tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin()
  OR EXISTS (SELECT 1 FROM public.partners p WHERE p.id = partner_links.partner_id AND p.user_id = auth.uid())
);
CREATE POLICY "partner_links_delete" ON public.partner_links FOR DELETE USING (
  tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin()
);

-- =============================================================================
-- partner_api_keys — HMAC-based auth per partner B2B
-- =============================================================================
CREATE TABLE public.partner_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  key_id TEXT NOT NULL UNIQUE,        -- public prefix (es. tck_live_abc123...) — usato in header X-API-Key
  secret_hash TEXT NOT NULL,           -- bcrypt(secret) for HMAC signing verification
  secret_last4 TEXT NOT NULL,
  name TEXT NOT NULL,
  scope TEXT[] NOT NULL DEFAULT '{}',  -- ['listings:read','availability:read','bookings:write','bookings:cancel']
  environment TEXT NOT NULL DEFAULT 'live' CHECK (environment IN ('live','sandbox')),
  rate_limit_per_minute INT NOT NULL DEFAULT 100 CHECK (rate_limit_per_minute > 0),
  ip_allowlist INET[] NOT NULL DEFAULT '{}',  -- vuoto = nessun restriction
  active BOOLEAN NOT NULL DEFAULT TRUE,
  last_used_at TIMESTAMPTZ,
  last_used_ip INET,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  revoked_reason TEXT,
  created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_partner_keys_partner ON public.partner_api_keys(partner_id);
CREATE INDEX idx_partner_keys_active ON public.partner_api_keys(key_id) WHERE active = TRUE;

CREATE TRIGGER set_partner_api_keys_updated_at
  BEFORE UPDATE ON public.partner_api_keys
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE public.partner_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "partner_keys_select" ON public.partner_api_keys FOR SELECT USING (
  tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin()
  OR EXISTS (SELECT 1 FROM public.partners p WHERE p.id = partner_api_keys.partner_id AND p.user_id = auth.uid())
);
CREATE POLICY "partner_keys_insert" ON public.partner_api_keys FOR INSERT WITH CHECK (
  tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin()
);
CREATE POLICY "partner_keys_update" ON public.partner_api_keys FOR UPDATE USING (
  tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin()
);
CREATE POLICY "partner_keys_delete" ON public.partner_api_keys FOR DELETE USING (
  tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin()
);

-- =============================================================================
-- partner_api_audit — audit immutabile ogni API call
-- =============================================================================
CREATE TABLE public.partner_api_audit (
  id BIGSERIAL PRIMARY KEY,
  partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  api_key_id UUID REFERENCES public.partner_api_keys(id) ON DELETE SET NULL,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  http_status INT,
  request_id TEXT,
  ip INET,
  user_agent TEXT,
  duration_ms INT,
  error_code TEXT,
  request_size_bytes INT,
  response_size_bytes INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_partner_audit_key ON public.partner_api_audit(api_key_id, created_at DESC);
CREATE INDEX idx_partner_audit_partner ON public.partner_api_audit(partner_id, created_at DESC);
CREATE INDEX idx_partner_audit_ip_time ON public.partner_api_audit(ip, created_at DESC);

ALTER TABLE public.partner_api_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "partner_audit_select" ON public.partner_api_audit FOR SELECT USING (
  tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin()
  OR EXISTS (SELECT 1 FROM public.partners p WHERE p.id = partner_api_audit.partner_id AND p.user_id = auth.uid())
);
-- Insert only via service_role (bypasses RLS)

-- Block update/delete (append-only)
CREATE OR REPLACE FUNCTION prevent_partner_audit_mutation() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'partner_api_audit is append-only'; END;
$$;
CREATE TRIGGER partner_audit_no_update BEFORE UPDATE ON public.partner_api_audit
  FOR EACH ROW EXECUTE FUNCTION prevent_partner_audit_mutation();
CREATE TRIGGER partner_audit_no_delete BEFORE DELETE ON public.partner_api_audit
  FOR EACH ROW EXECUTE FUNCTION prevent_partner_audit_mutation();

-- =============================================================================
-- partner_commissions — commission tracking per booking
-- =============================================================================
CREATE TABLE public.partner_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE RESTRICT,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  partner_link_id UUID REFERENCES public.partner_links(id) ON DELETE SET NULL,
  -- Source
  source_type TEXT NOT NULL CHECK (source_type IN ('url','embed','api')),
  -- Reservation polymorphic
  reservation_id UUID NOT NULL,
  reservation_table TEXT NOT NULL CHECK (reservation_table IN (
    'reservations','restaurant_reservations','bike_rental_reservations','reservation_bundles'
  )),
  vertical TEXT NOT NULL CHECK (vertical IN ('hospitality','restaurant','bike_rental','experiences','wellness')),
  -- Financials
  booking_amount NUMERIC(12,2) NOT NULL CHECK (booking_amount >= 0),
  commission_pct NUMERIC(5,2) NOT NULL CHECK (commission_pct >= 0 AND commission_pct <= 100),
  commission_amount NUMERIC(12,2) NOT NULL CHECK (commission_amount >= 0),
  currency TEXT NOT NULL DEFAULT 'EUR',
  -- State machine
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','earned','approved','paid','reversed','disputed')),
  earned_at TIMESTAMPTZ,  -- quando booking conferma + payment captured
  approved_at TIMESTAMPTZ,
  approved_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  paid_at TIMESTAMPTZ,
  payout_id UUID,  -- FK forward a partner_payouts
  reversed_at TIMESTAMPTZ,
  reversed_reason TEXT,
  -- Idempotency: impossibile creare 2 commission su stesso booking
  idempotency_key TEXT,
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (reservation_id, reservation_table, partner_id),
  UNIQUE (idempotency_key, tenant_id)
);

CREATE INDEX idx_partner_comm_partner ON public.partner_commissions(partner_id, status, created_at DESC);
CREATE INDEX idx_partner_comm_tenant ON public.partner_commissions(tenant_id, status, created_at DESC);
CREATE INDEX idx_partner_comm_reservation ON public.partner_commissions(reservation_id, reservation_table);
CREATE INDEX idx_partner_comm_unpaid ON public.partner_commissions(partner_id, status) WHERE status IN ('earned','approved');

CREATE TRIGGER set_partner_commissions_updated_at
  BEFORE UPDATE ON public.partner_commissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE public.partner_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "partner_comm_select" ON public.partner_commissions FOR SELECT USING (
  tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin()
  OR EXISTS (SELECT 1 FROM public.partners p WHERE p.id = partner_commissions.partner_id AND p.user_id = auth.uid())
);
CREATE POLICY "partner_comm_insert" ON public.partner_commissions FOR INSERT WITH CHECK (
  tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin()
);
CREATE POLICY "partner_comm_update" ON public.partner_commissions FOR UPDATE USING (
  tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin()
);

-- =============================================================================
-- partner_payouts — aggregazione per Stripe Connect transfer
-- =============================================================================
CREATE TABLE public.partner_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE RESTRICT,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  period_start DATE,
  period_end DATE,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  commission_count INT NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  method TEXT NOT NULL CHECK (method IN ('stripe_connect','bank_transfer','manual')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','paid','failed','cancelled')),
  stripe_transfer_id TEXT,
  bank_reference TEXT,
  initiated_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  failure_reason TEXT,
  receipt_url TEXT,
  created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_partner_payouts_partner ON public.partner_payouts(partner_id, created_at DESC);
CREATE INDEX idx_partner_payouts_tenant ON public.partner_payouts(tenant_id, status);

CREATE TRIGGER set_partner_payouts_updated_at
  BEFORE UPDATE ON public.partner_payouts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE public.partner_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "partner_payouts_select" ON public.partner_payouts FOR SELECT USING (
  tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin()
  OR EXISTS (SELECT 1 FROM public.partners p WHERE p.id = partner_payouts.partner_id AND p.user_id = auth.uid())
);
CREATE POLICY "partner_payouts_insert" ON public.partner_payouts FOR INSERT WITH CHECK (
  tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin()
);
CREATE POLICY "partner_payouts_update" ON public.partner_payouts FOR UPDATE USING (
  tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin()
);

-- FK forward partner_commissions.payout_id
ALTER TABLE public.partner_commissions
  ADD CONSTRAINT fk_commission_payout FOREIGN KEY (payout_id)
  REFERENCES public.partner_payouts(id) ON DELETE SET NULL;

-- =============================================================================
-- partner_webhooks — endpoints configurati per notifiche eventi
-- =============================================================================
CREATE TABLE public.partner_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  events TEXT[] NOT NULL,  -- ['booking.confirmed','booking.cancelled','commission.earned','commission.paid']
  secret_hash TEXT NOT NULL,  -- per HMAC signing webhook payload
  secret_last4 TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  last_fired_at TIMESTAMPTZ,
  last_status_code INT,
  failure_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_partner_webhooks_partner ON public.partner_webhooks(partner_id) WHERE active = TRUE;

CREATE TRIGGER set_partner_webhooks_updated_at
  BEFORE UPDATE ON public.partner_webhooks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE public.partner_webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "partner_webhooks_select" ON public.partner_webhooks FOR SELECT USING (
  tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin()
  OR EXISTS (SELECT 1 FROM public.partners p WHERE p.id = partner_webhooks.partner_id AND p.user_id = auth.uid())
);
CREATE POLICY "partner_webhooks_insert" ON public.partner_webhooks FOR INSERT WITH CHECK (
  tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin()
  OR EXISTS (SELECT 1 FROM public.partners p WHERE p.id = partner_webhooks.partner_id AND p.user_id = auth.uid())
);
CREATE POLICY "partner_webhooks_update" ON public.partner_webhooks FOR UPDATE USING (
  tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin()
  OR EXISTS (SELECT 1 FROM public.partners p WHERE p.id = partner_webhooks.partner_id AND p.user_id = auth.uid())
);

-- =============================================================================
-- Helper: record partner link click (rate-limit-safe via PG function)
-- =============================================================================
CREATE OR REPLACE FUNCTION record_partner_link_click(p_code TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link_id UUID;
BEGIN
  UPDATE public.partner_links
  SET click_count = click_count + 1,
      last_click_at = NOW()
  WHERE code = p_code AND active = TRUE
    AND (valid_from IS NULL OR valid_from <= NOW())
    AND (valid_until IS NULL OR valid_until > NOW())
  RETURNING id INTO v_link_id;
  RETURN v_link_id;
END;
$$;

GRANT EXECUTE ON FUNCTION record_partner_link_click TO authenticated, anon, service_role;

-- =============================================================================
-- FK ref per credit_instruments.partner_id (forward ref ora risolvibile)
-- =============================================================================
ALTER TABLE public.credit_instruments
  ADD CONSTRAINT fk_credit_partner FOREIGN KEY (partner_id)
  REFERENCES public.partners(id) ON DELETE SET NULL;

COMMIT;
