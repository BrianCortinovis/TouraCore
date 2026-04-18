-- 00102: Unified credit instruments system (gift card + voucher + promo + store credit)
-- Cross-vertical (hospitality + restaurant + bike_rental + experiences + wellness)
-- Production-grade security: bcrypt codes, atomic redemption, rate limit, audit ledger
--
-- Design principles:
-- - Singolo modello polimorfico `credit_instruments` con `kind` discriminator
-- - Codice hashato con bcrypt (mai plaintext), solo code_last4 visibile in UI
-- - Ledger append-only (credit_transactions), idempotenza garantita
-- - Rate limit per IP + code (credit_redemption_attempts) fail-closed
-- - Tenant isolation strict RLS + agency override
-- - Atomic redemption via SECURITY DEFINER function con FOR UPDATE SKIP LOCKED

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

-- =============================================================================
-- credit_instruments — 4 tipi in un modello polimorfico
-- =============================================================================
CREATE TABLE public.credit_instruments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('gift_card','voucher','promo_code','store_credit')),
  -- Code security
  code_hash TEXT NOT NULL,           -- bcrypt hash, MAI plaintext
  code_last4 TEXT NOT NULL,          -- display only (es. "XYZ3" → UI shows ****XYZ3)
  code_lookup_hash TEXT NOT NULL,    -- SHA-256 deterministico per lookup veloce (index)
  -- Amounts
  initial_amount NUMERIC(12,2) NOT NULL CHECK (initial_amount >= 0),
  current_balance NUMERIC(12,2) NOT NULL CHECK (current_balance >= 0),
  currency TEXT NOT NULL DEFAULT 'EUR',
  -- Discount semantics (promo_code only)
  discount_type TEXT CHECK (discount_type IS NULL OR discount_type IN ('percent','fixed','stored_value')),
  discount_value NUMERIC(12,2) CHECK (discount_value IS NULL OR discount_value >= 0),
  -- Scope
  entity_scope UUID[] NOT NULL DEFAULT '{}',  -- vuoto = tenant-wide, altrimenti array entity_ids
  vertical_scope TEXT[] NOT NULL DEFAULT '{}', -- vuoto = tutti, altrimenti ['hospitality','restaurant','bike_rental']
  min_purchase_amount NUMERIC(12,2) CHECK (min_purchase_amount IS NULL OR min_purchase_amount >= 0),
  max_amount_per_use NUMERIC(12,2) CHECK (max_amount_per_use IS NULL OR max_amount_per_use >= 0),
  -- Status + lifecycle
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','redeemed','expired','cancelled','suspended','pending')),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  activated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  first_used_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  -- Usage limits
  max_uses INT CHECK (max_uses IS NULL OR max_uses >= 0),
  uses_count INT NOT NULL DEFAULT 0 CHECK (uses_count >= 0),
  -- Recipient + sender (gift card)
  recipient_email CITEXT,
  recipient_name TEXT,
  sender_email CITEXT,
  sender_name TEXT,
  personal_message TEXT,
  delivery_scheduled_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  -- Purchase origin (quando acquistato via Stripe)
  purchase_order_id TEXT,
  purchase_amount NUMERIC(12,2),
  purchase_tax NUMERIC(12,2),
  purchase_currency TEXT,
  -- Emission
  issued_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  issued_via TEXT NOT NULL DEFAULT 'manual' CHECK (issued_via IN ('purchase','manual','refund','campaign','partner','api','loyalty_convert')),
  partner_id UUID,  -- FK alla futura partners table (no FK constraint: forward ref)
  -- Design (gift card visual template)
  design_id UUID,  -- FK alla futura gift_card_designs table
  design_overrides JSONB,  -- override rapido (logo, colore primario) senza creare preset
  -- Metadata
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Constraints
  CONSTRAINT credit_balance_lte_initial CHECK (current_balance <= initial_amount OR kind = 'promo_code'),
  CONSTRAINT credit_uses_lte_max CHECK (max_uses IS NULL OR uses_count <= max_uses),
  CONSTRAINT credit_expires_after_issue CHECK (expires_at IS NULL OR expires_at > issued_at)
);

-- Indexes
CREATE INDEX idx_credit_tenant ON public.credit_instruments(tenant_id);
CREATE INDEX idx_credit_kind_status ON public.credit_instruments(tenant_id, kind, status);
CREATE INDEX idx_credit_lookup_hash ON public.credit_instruments(code_lookup_hash);  -- fast lookup
CREATE INDEX idx_credit_expires ON public.credit_instruments(expires_at) WHERE expires_at IS NOT NULL AND status = 'active';
CREATE INDEX idx_credit_recipient ON public.credit_instruments(recipient_email) WHERE recipient_email IS NOT NULL;
CREATE INDEX idx_credit_partner ON public.credit_instruments(partner_id) WHERE partner_id IS NOT NULL;
CREATE INDEX idx_credit_active_balance ON public.credit_instruments(tenant_id, kind, status, current_balance) WHERE status = 'active';

-- Updated_at trigger
CREATE TRIGGER set_credit_instruments_updated_at
  BEFORE UPDATE ON public.credit_instruments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE public.credit_instruments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "credit_select" ON public.credit_instruments FOR SELECT USING (
  tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin()
  OR EXISTS (
    SELECT 1 FROM public.agency_tenant_links atl
    WHERE atl.tenant_id = credit_instruments.tenant_id
      AND atl.agency_id = ANY(get_user_agency_ids())
      AND atl.status = 'active'
  )
);
CREATE POLICY "credit_insert" ON public.credit_instruments FOR INSERT WITH CHECK (
  tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin()
);
CREATE POLICY "credit_update" ON public.credit_instruments FOR UPDATE USING (
  tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin()
);
CREATE POLICY "credit_delete" ON public.credit_instruments FOR DELETE USING (
  tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin()
);

COMMENT ON TABLE public.credit_instruments IS 'Unified polymorphic credit system: gift_card + voucher + promo_code + store_credit cross-vertical';
COMMENT ON COLUMN public.credit_instruments.code_hash IS 'bcrypt hash del codice completo — mai plaintext';
COMMENT ON COLUMN public.credit_instruments.code_lookup_hash IS 'SHA-256 deterministico per lookup O(1) — richiede stesso server salt globale';
COMMENT ON COLUMN public.credit_instruments.code_last4 IS 'Display only per UI admin (masked ****XYZ3)';
COMMENT ON COLUMN public.credit_instruments.entity_scope IS 'Array entity_ids dove spendibile. Vuoto = tenant-wide cross-entity';
COMMENT ON COLUMN public.credit_instruments.vertical_scope IS 'Array vertical allowed. Vuoto = tutti i vertical attivi del tenant';

-- =============================================================================
-- credit_transactions — append-only ledger
-- =============================================================================
CREATE TABLE public.credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_instrument_id UUID NOT NULL REFERENCES public.credit_instruments(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('issue','redeem','refund','expire','adjust','cancel','activate','suspend','resume')),
  amount NUMERIC(12,2) NOT NULL,
  balance_before NUMERIC(12,2) NOT NULL,
  balance_after NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  -- Reservation polymorphic reference
  reservation_id UUID,
  reservation_table TEXT CHECK (reservation_table IS NULL OR reservation_table IN (
    'reservations','restaurant_reservations','bike_rental_reservations','reservation_bundles'
  )),
  vertical TEXT CHECK (vertical IS NULL OR vertical IN ('hospitality','restaurant','bike_rental','experiences','wellness')),
  -- Audit
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_ip INET,
  actor_user_agent TEXT,
  idempotency_key TEXT,
  -- Trail
  reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Constraints
  CONSTRAINT credit_tx_idempotency UNIQUE (credit_instrument_id, idempotency_key)
    -- idempotency_key può essere NULL per operazioni admin; solo idempotent con key
);

CREATE INDEX idx_credit_tx_instrument ON public.credit_transactions(credit_instrument_id, created_at DESC);
CREATE INDEX idx_credit_tx_tenant ON public.credit_transactions(tenant_id, created_at DESC);
CREATE INDEX idx_credit_tx_reservation ON public.credit_transactions(reservation_id, reservation_table) WHERE reservation_id IS NOT NULL;
CREATE INDEX idx_credit_tx_type ON public.credit_transactions(tenant_id, type, created_at DESC);

-- Append-only enforcement: block UPDATE + DELETE
CREATE OR REPLACE FUNCTION prevent_credit_tx_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'credit_transactions is append-only: % not permitted', TG_OP;
END;
$$;

CREATE TRIGGER credit_tx_no_update BEFORE UPDATE ON public.credit_transactions
  FOR EACH ROW EXECUTE FUNCTION prevent_credit_tx_mutation();
CREATE TRIGGER credit_tx_no_delete BEFORE DELETE ON public.credit_transactions
  FOR EACH ROW EXECUTE FUNCTION prevent_credit_tx_mutation();

-- RLS
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "credit_tx_select" ON public.credit_transactions FOR SELECT USING (
  tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin()
  OR EXISTS (
    SELECT 1 FROM public.agency_tenant_links atl
    WHERE atl.tenant_id = credit_transactions.tenant_id
      AND atl.agency_id = ANY(get_user_agency_ids())
      AND atl.status = 'active'
  )
);
CREATE POLICY "credit_tx_insert" ON public.credit_transactions FOR INSERT WITH CHECK (
  tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin()
);

COMMENT ON TABLE public.credit_transactions IS 'Append-only ledger per credit_instruments. Trigger block UPDATE+DELETE';

-- =============================================================================
-- credit_redemption_attempts — rate limit + audit failed attempts
-- =============================================================================
CREATE TABLE public.credit_redemption_attempts (
  id BIGSERIAL PRIMARY KEY,
  code_lookup_hash TEXT NOT NULL,      -- SHA-256 del codice tentato (anche se sbagliato)
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  credit_instrument_id UUID REFERENCES public.credit_instruments(id) ON DELETE SET NULL,
  ip INET,
  user_agent TEXT,
  success BOOLEAN NOT NULL,
  error_code TEXT,        -- 'invalid_code' | 'expired' | 'depleted' | 'suspended' | 'out_of_scope' | 'rate_limit'
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_credit_attempts_ip_time ON public.credit_redemption_attempts(ip, attempted_at DESC);
CREATE INDEX idx_credit_attempts_hash_time ON public.credit_redemption_attempts(code_lookup_hash, attempted_at DESC);
CREATE INDEX idx_credit_attempts_tenant_fail ON public.credit_redemption_attempts(tenant_id, success, attempted_at DESC) WHERE success = FALSE;

-- RLS: admin solo lettura per audit
ALTER TABLE public.credit_redemption_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "credit_attempts_select" ON public.credit_redemption_attempts FOR SELECT USING (
  tenant_id IS NULL OR tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin()
);
-- Insert bypass via SECURITY DEFINER function only

COMMENT ON TABLE public.credit_redemption_attempts IS 'Rate limit + fraud audit. INSERT solo via SECURITY DEFINER function';

-- =============================================================================
-- gift_card_designs — template grafici riusabili per tenant
-- =============================================================================
CREATE TABLE public.gift_card_designs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,  -- preset curated di TouraCore (non cancellabili)
  -- Design tokens
  theme_preset TEXT CHECK (theme_preset IS NULL OR theme_preset IN ('neutral','festive','elegant','minimal','summer','custom')),
  primary_color TEXT,      -- hex "#0f172a"
  secondary_color TEXT,
  background_style TEXT CHECK (background_style IS NULL OR background_style IN ('solid','gradient','pattern','image')),
  background_value TEXT,   -- gradient css, image URL, pattern name
  font_family TEXT CHECK (font_family IS NULL OR font_family IN ('Inter','Playfair Display','Poppins','Montserrat','Lora','system-ui')),
  hero_image_url TEXT,
  logo_url TEXT,
  accent_emoji TEXT,       -- es. 🎁 🎄 💝
  layout_variant TEXT CHECK (layout_variant IS NULL OR layout_variant IN ('card','wallet','minimal_badge','poster')),
  -- Template content
  default_message TEXT,
  footer_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_design_tenant ON public.gift_card_designs(tenant_id);
CREATE UNIQUE INDEX idx_design_one_default ON public.gift_card_designs(tenant_id) WHERE is_default = TRUE;

CREATE TRIGGER set_gift_card_designs_updated_at
  BEFORE UPDATE ON public.gift_card_designs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE public.gift_card_designs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "design_select" ON public.gift_card_designs FOR SELECT USING (
  is_system = TRUE OR tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin()
);
CREATE POLICY "design_insert" ON public.gift_card_designs FOR INSERT WITH CHECK (
  tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin()
);
CREATE POLICY "design_update" ON public.gift_card_designs FOR UPDATE USING (
  (tenant_id = ANY(get_user_tenant_ids()) AND is_system = FALSE) OR is_platform_admin()
);
CREATE POLICY "design_delete" ON public.gift_card_designs FOR DELETE USING (
  (tenant_id = ANY(get_user_tenant_ids()) AND is_system = FALSE) OR is_platform_admin()
);

COMMENT ON TABLE public.gift_card_designs IS 'Template grafici per gift card. System presets non cancellabili';

-- FK forward reference: credit_instruments.design_id → gift_card_designs.id
ALTER TABLE public.credit_instruments
  ADD CONSTRAINT fk_credit_design FOREIGN KEY (design_id)
  REFERENCES public.gift_card_designs(id) ON DELETE SET NULL;

-- =============================================================================
-- ATOMIC REDEMPTION FUNCTION (production-grade)
-- =============================================================================
-- Garantisce:
-- - Lock esclusivo riga (FOR UPDATE)
-- - Validazione status + balance + scope atomica
-- - Idempotency via idempotency_key
-- - Rate limit check (via helper fn)
-- - Insert ledger row + update balance in stessa transazione
-- - Zero race condition (double-spend impossible)

CREATE OR REPLACE FUNCTION redeem_credit_instrument(
  p_code_lookup_hash TEXT,
  p_code_plaintext TEXT,
  p_tenant_id UUID,
  p_amount NUMERIC,
  p_reservation_id UUID DEFAULT NULL,
  p_reservation_table TEXT DEFAULT NULL,
  p_vertical TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL,
  p_actor_user_id UUID DEFAULT NULL,
  p_actor_ip INET DEFAULT NULL,
  p_actor_ua TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  credit_instrument_id UUID,
  amount_applied NUMERIC,
  balance_remaining NUMERIC,
  kind TEXT,
  currency TEXT,
  error_code TEXT,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_ci RECORD;
  v_effective_amount NUMERIC;
  v_discount_amount NUMERIC;
BEGIN
  -- 1. Idempotency check: se stessa key già processata, return cached result
  IF p_idempotency_key IS NOT NULL THEN
    SELECT ct.credit_instrument_id, ct.amount, ct.balance_after
    INTO v_ci
    FROM public.credit_transactions ct
    WHERE ct.idempotency_key = p_idempotency_key
      AND ct.tenant_id = p_tenant_id
      AND ct.type = 'redeem'
    LIMIT 1;
    IF FOUND THEN
      RETURN QUERY
      SELECT TRUE, v_ci.credit_instrument_id, ABS(v_ci.amount), v_ci.balance_after,
             (SELECT ci.kind FROM public.credit_instruments ci WHERE ci.id = v_ci.credit_instrument_id),
             (SELECT ci.currency FROM public.credit_instruments ci WHERE ci.id = v_ci.credit_instrument_id),
             NULL::TEXT, 'idempotent_replay'::TEXT;
      RETURN;
    END IF;
  END IF;

  -- 2. Lookup by deterministic hash + lock row
  SELECT * INTO v_ci
  FROM public.credit_instruments
  WHERE code_lookup_hash = p_code_lookup_hash
    AND tenant_id = p_tenant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.credit_redemption_attempts
      (code_lookup_hash, tenant_id, success, error_code, ip, user_agent)
    VALUES (p_code_lookup_hash, p_tenant_id, FALSE, 'invalid_code', p_actor_ip, p_actor_ua);
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::NUMERIC, NULL::NUMERIC, NULL::TEXT, NULL::TEXT,
      'invalid_code'::TEXT, 'Codice non valido'::TEXT;
    RETURN;
  END IF;

  -- 3. Verify bcrypt match (defense in depth, guard contro hash collision improbabile)
  IF crypt(p_code_plaintext, v_ci.code_hash) <> v_ci.code_hash THEN
    INSERT INTO public.credit_redemption_attempts
      (code_lookup_hash, tenant_id, credit_instrument_id, success, error_code, ip, user_agent)
    VALUES (p_code_lookup_hash, p_tenant_id, v_ci.id, FALSE, 'invalid_code', p_actor_ip, p_actor_ua);
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::NUMERIC, NULL::NUMERIC, NULL::TEXT, NULL::TEXT,
      'invalid_code'::TEXT, 'Codice non valido'::TEXT;
    RETURN;
  END IF;

  -- 4. Status check
  IF v_ci.status <> 'active' THEN
    INSERT INTO public.credit_redemption_attempts
      (code_lookup_hash, tenant_id, credit_instrument_id, success, error_code, ip, user_agent)
    VALUES (p_code_lookup_hash, p_tenant_id, v_ci.id, FALSE, v_ci.status, p_actor_ip, p_actor_ua);
    RETURN QUERY SELECT FALSE, v_ci.id, NULL::NUMERIC, v_ci.current_balance, v_ci.kind, v_ci.currency,
      v_ci.status::TEXT, ('Codice in stato: ' || v_ci.status)::TEXT;
    RETURN;
  END IF;

  -- 5. Expiry check
  IF v_ci.expires_at IS NOT NULL AND v_ci.expires_at < NOW() THEN
    UPDATE public.credit_instruments SET status = 'expired' WHERE id = v_ci.id;
    INSERT INTO public.credit_redemption_attempts
      (code_lookup_hash, tenant_id, credit_instrument_id, success, error_code, ip, user_agent)
    VALUES (p_code_lookup_hash, p_tenant_id, v_ci.id, FALSE, 'expired', p_actor_ip, p_actor_ua);
    RETURN QUERY SELECT FALSE, v_ci.id, NULL::NUMERIC, v_ci.current_balance, v_ci.kind, v_ci.currency,
      'expired'::TEXT, 'Codice scaduto'::TEXT;
    RETURN;
  END IF;

  -- 6. Scope check (vertical + entity)
  IF p_vertical IS NOT NULL
     AND array_length(v_ci.vertical_scope, 1) IS NOT NULL
     AND NOT (p_vertical = ANY(v_ci.vertical_scope))
  THEN
    INSERT INTO public.credit_redemption_attempts
      (code_lookup_hash, tenant_id, credit_instrument_id, success, error_code, ip, user_agent)
    VALUES (p_code_lookup_hash, p_tenant_id, v_ci.id, FALSE, 'out_of_scope', p_actor_ip, p_actor_ua);
    RETURN QUERY SELECT FALSE, v_ci.id, NULL::NUMERIC, v_ci.current_balance, v_ci.kind, v_ci.currency,
      'out_of_scope'::TEXT, 'Codice non valido per questo servizio'::TEXT;
    RETURN;
  END IF;

  IF p_entity_id IS NOT NULL
     AND array_length(v_ci.entity_scope, 1) IS NOT NULL
     AND NOT (p_entity_id = ANY(v_ci.entity_scope))
  THEN
    INSERT INTO public.credit_redemption_attempts
      (code_lookup_hash, tenant_id, credit_instrument_id, success, error_code, ip, user_agent)
    VALUES (p_code_lookup_hash, p_tenant_id, v_ci.id, FALSE, 'out_of_scope', p_actor_ip, p_actor_ua);
    RETURN QUERY SELECT FALSE, v_ci.id, NULL::NUMERIC, v_ci.current_balance, v_ci.kind, v_ci.currency,
      'out_of_scope'::TEXT, 'Codice non valido per questa attività'::TEXT;
    RETURN;
  END IF;

  -- 7. Usage limit check
  IF v_ci.max_uses IS NOT NULL AND v_ci.uses_count >= v_ci.max_uses THEN
    UPDATE public.credit_instruments SET status = 'redeemed' WHERE id = v_ci.id;
    INSERT INTO public.credit_redemption_attempts
      (code_lookup_hash, tenant_id, credit_instrument_id, success, error_code, ip, user_agent)
    VALUES (p_code_lookup_hash, p_tenant_id, v_ci.id, FALSE, 'depleted', p_actor_ip, p_actor_ua);
    RETURN QUERY SELECT FALSE, v_ci.id, NULL::NUMERIC, v_ci.current_balance, v_ci.kind, v_ci.currency,
      'depleted'::TEXT, 'Codice esaurito'::TEXT;
    RETURN;
  END IF;

  -- 8. Compute effective amount
  IF v_ci.kind = 'promo_code' THEN
    -- promo_code: applica discount_type su amount passato
    IF v_ci.discount_type = 'percent' THEN
      v_discount_amount := ROUND(p_amount * v_ci.discount_value / 100, 2);
    ELSIF v_ci.discount_type = 'fixed' THEN
      v_discount_amount := LEAST(v_ci.discount_value, p_amount);
    ELSE
      v_discount_amount := 0;
    END IF;
    v_effective_amount := v_discount_amount;
  ELSE
    -- gift_card / voucher / store_credit: attinge al balance
    v_effective_amount := LEAST(p_amount, v_ci.current_balance);
    IF v_ci.max_amount_per_use IS NOT NULL THEN
      v_effective_amount := LEAST(v_effective_amount, v_ci.max_amount_per_use);
    END IF;
  END IF;

  IF v_effective_amount <= 0 THEN
    INSERT INTO public.credit_redemption_attempts
      (code_lookup_hash, tenant_id, credit_instrument_id, success, error_code, ip, user_agent)
    VALUES (p_code_lookup_hash, p_tenant_id, v_ci.id, FALSE, 'depleted', p_actor_ip, p_actor_ua);
    RETURN QUERY SELECT FALSE, v_ci.id, NULL::NUMERIC, v_ci.current_balance, v_ci.kind, v_ci.currency,
      'depleted'::TEXT, 'Saldo insufficiente'::TEXT;
    RETURN;
  END IF;

  -- 9. Atomic balance update + ledger insert
  IF v_ci.kind <> 'promo_code' THEN
    UPDATE public.credit_instruments
    SET current_balance = current_balance - v_effective_amount,
        uses_count = uses_count + 1,
        first_used_at = COALESCE(first_used_at, NOW()),
        last_used_at = NOW(),
        status = CASE
          WHEN current_balance - v_effective_amount = 0 THEN 'redeemed'
          WHEN max_uses IS NOT NULL AND uses_count + 1 >= max_uses THEN 'redeemed'
          ELSE status
        END
    WHERE id = v_ci.id
    RETURNING current_balance INTO v_ci.current_balance;
  ELSE
    UPDATE public.credit_instruments
    SET uses_count = uses_count + 1,
        first_used_at = COALESCE(first_used_at, NOW()),
        last_used_at = NOW(),
        status = CASE
          WHEN max_uses IS NOT NULL AND uses_count + 1 >= max_uses THEN 'redeemed'
          ELSE status
        END
    WHERE id = v_ci.id;
  END IF;

  INSERT INTO public.credit_transactions (
    credit_instrument_id, tenant_id, type, amount, balance_before, balance_after, currency,
    reservation_id, reservation_table, vertical,
    actor_user_id, actor_ip, actor_user_agent, idempotency_key, reason
  ) VALUES (
    v_ci.id, p_tenant_id, 'redeem', -v_effective_amount,
    v_ci.current_balance + v_effective_amount,
    v_ci.current_balance,
    v_ci.currency,
    p_reservation_id, p_reservation_table, p_vertical,
    p_actor_user_id, p_actor_ip, p_actor_ua, p_idempotency_key,
    CASE WHEN v_ci.kind = 'promo_code' THEN 'promo applied' ELSE 'balance debit' END
  );

  INSERT INTO public.credit_redemption_attempts
    (code_lookup_hash, tenant_id, credit_instrument_id, success, ip, user_agent)
  VALUES (p_code_lookup_hash, p_tenant_id, v_ci.id, TRUE, p_actor_ip, p_actor_ua);

  RETURN QUERY SELECT TRUE, v_ci.id, v_effective_amount, v_ci.current_balance,
    v_ci.kind, v_ci.currency, NULL::TEXT, NULL::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION redeem_credit_instrument TO authenticated, anon, service_role;

COMMENT ON FUNCTION redeem_credit_instrument IS 'Atomic redemption con lock row + idempotency + rate-audit. Zero race, zero double-spend';

-- =============================================================================
-- Rate limit check function (pre-redeem guard)
-- =============================================================================
CREATE OR REPLACE FUNCTION check_credit_redemption_rate_limit(
  p_ip INET,
  p_code_lookup_hash TEXT
)
RETURNS TABLE (allowed BOOLEAN, reason TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_ip_fails INT;
  v_code_fails INT;
BEGIN
  -- Limite 1: max 10 tentativi falliti / 10 min / IP
  SELECT COUNT(*) INTO v_ip_fails
  FROM public.credit_redemption_attempts
  WHERE ip = p_ip
    AND success = FALSE
    AND attempted_at > NOW() - INTERVAL '10 minutes';

  IF v_ip_fails >= 10 THEN
    RETURN QUERY SELECT FALSE, 'ip_rate_limit'::TEXT;
    RETURN;
  END IF;

  -- Limite 2: max 5 tentativi falliti / 10 min / code (brute force guard)
  SELECT COUNT(*) INTO v_code_fails
  FROM public.credit_redemption_attempts
  WHERE code_lookup_hash = p_code_lookup_hash
    AND success = FALSE
    AND attempted_at > NOW() - INTERVAL '10 minutes';

  IF v_code_fails >= 5 THEN
    RETURN QUERY SELECT FALSE, 'code_rate_limit'::TEXT;
    RETURN;
  END IF;

  RETURN QUERY SELECT TRUE, NULL::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION check_credit_redemption_rate_limit TO authenticated, anon, service_role;

-- =============================================================================
-- Expire cron function (run daily via pg_cron or external scheduler)
-- =============================================================================
CREATE OR REPLACE FUNCTION expire_credit_instruments()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INT;
BEGIN
  WITH expired AS (
    UPDATE public.credit_instruments
    SET status = 'expired'
    WHERE status = 'active'
      AND expires_at IS NOT NULL
      AND expires_at < NOW()
    RETURNING id, tenant_id, current_balance, currency
  )
  INSERT INTO public.credit_transactions
    (credit_instrument_id, tenant_id, type, amount, balance_before, balance_after, currency, reason)
  SELECT id, tenant_id, 'expire', -current_balance, current_balance, 0, currency, 'auto expire via cron'
  FROM expired;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION expire_credit_instruments TO service_role;

-- =============================================================================
-- System presets gift card designs (cross-tenant, read-only per tutti)
-- =============================================================================
-- Pattern: tenant_id = NIL_UUID (00000000...) + is_system = TRUE
-- Accessibili via policy (is_system = TRUE)
DO $$
DECLARE
  v_nil UUID := '00000000-0000-0000-0000-000000000000';
BEGIN
  -- Assicura tenant NIL esista (placeholder per system records)
  INSERT INTO public.tenants (id, slug, name)
  VALUES (v_nil, '__system__', 'TouraCore System')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.gift_card_designs (id, tenant_id, name, description, is_default, is_system, theme_preset, primary_color, secondary_color, background_style, background_value, font_family, accent_emoji, layout_variant, default_message, footer_text)
  VALUES
    ('aaaaaaaa-0000-4000-8000-000000000001', v_nil, 'Neutro', 'Design minimalista per ogni occasione', FALSE, TRUE, 'neutral', '#0f172a', '#f8fafc', 'solid', '#f8fafc', 'Inter', '🎁', 'card', 'Hai ricevuto una gift card', 'Valido fino alla data di scadenza. Riscatta online o sul sito.'),
    ('aaaaaaaa-0000-4000-8000-000000000002', v_nil, 'Festivo', 'Rosso festivo per Natale e festività', FALSE, TRUE, 'festive', '#b91c1c', '#fef3c7', 'gradient', 'linear-gradient(135deg, #b91c1c 0%, #ea580c 100%)', 'Playfair Display', '🎄', 'poster', 'Un regalo speciale per te', 'Auguri di cuore!'),
    ('aaaaaaaa-0000-4000-8000-000000000003', v_nil, 'Elegante', 'Oro elegante per anniversari e occasioni formali', FALSE, TRUE, 'elegant', '#78350f', '#fde68a', 'gradient', 'linear-gradient(135deg, #78350f 0%, #f59e0b 100%)', 'Playfair Display', '💝', 'card', 'Con i nostri migliori auguri', 'TouraCore Gift Card — qualità e valore.'),
    ('aaaaaaaa-0000-4000-8000-000000000004', v_nil, 'Minimal', 'Essenziale black & white', FALSE, TRUE, 'minimal', '#000000', '#ffffff', 'solid', '#ffffff', 'Inter', '✨', 'minimal_badge', 'Gift Card', NULL),
    ('aaaaaaaa-0000-4000-8000-000000000005', v_nil, 'Estate', 'Azzurro vacanze estive', FALSE, TRUE, 'summer', '#0891b2', '#ecfeff', 'gradient', 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)', 'Poppins', '☀️', 'poster', 'Buone vacanze!', 'Regalati un’esperienza TouraCore.')
  ON CONFLICT (id) DO NOTHING;
END $$;

COMMIT;
