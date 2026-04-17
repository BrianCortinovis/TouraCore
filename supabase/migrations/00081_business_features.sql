-- 00081: Inbox 2-way + Smart locks + Dynamic pricing + Guest portal + Reviews + Loyalty + Restaurant_charts

-- ============================================================================
-- INBOX 2-WAY messaging (hospitality)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.message_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  guest_id UUID,
  reservation_id UUID,
  channel TEXT NOT NULL CHECK (channel IN ('email','sms','whatsapp','booking_chat','airbnb_chat','widget')),
  external_thread_id TEXT,
  subject TEXT,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed','archived')),
  unread_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_message_threads_entity ON public.message_threads(entity_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_threads_reservation ON public.message_threads(reservation_id) WHERE reservation_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.thread_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.message_threads(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('inbound','outbound')),
  sender_user_id UUID REFERENCES auth.users(id),
  sender_name TEXT,
  body TEXT NOT NULL,
  attachments JSONB,
  external_message_id TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_thread_messages_thread ON public.thread_messages(thread_id, sent_at);

ALTER TABLE public.message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thread_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "message_threads_all" ON public.message_threads;
CREATE POLICY "message_threads_all" ON public.message_threads
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.entities e WHERE e.id = message_threads.entity_id
            AND (e.tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.entities e WHERE e.id = message_threads.entity_id
            AND (e.tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin()))
  );

DROP POLICY IF EXISTS "thread_messages_all" ON public.thread_messages;
CREATE POLICY "thread_messages_all" ON public.thread_messages
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.message_threads t
            JOIN public.entities e ON e.id = t.entity_id
            WHERE t.id = thread_messages.thread_id
              AND (e.tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.message_threads t
            JOIN public.entities e ON e.id = t.entity_id
            WHERE t.id = thread_messages.thread_id
              AND (e.tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin()))
  );

DROP TRIGGER IF EXISTS set_message_threads_updated_at ON public.message_threads;
CREATE TRIGGER set_message_threads_updated_at BEFORE UPDATE ON public.message_threads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- SMART LOCKS (Nuki/TTLock/Igloohome)
-- ============================================================================

-- Smart locks: estendi tabella esistente se presente, altrimenti crea
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='smart_locks') THEN
    CREATE TABLE public.smart_locks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      entity_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
      room_id UUID,
      provider TEXT NOT NULL,
      device_id TEXT NOT NULL,
      device_name TEXT NOT NULL,
      access_method TEXT NOT NULL DEFAULT 'pin',
      config_encrypted TEXT,
      config_meta JSONB DEFAULT '{}'::jsonb,
      battery_level SMALLINT,
      last_seen_at TIMESTAMPTZ,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (entity_id, provider, device_id)
    );
  ELSE
    -- Aggiunge colonne mancanti senza distruggere dati esistenti
    ALTER TABLE public.smart_locks
      ADD COLUMN IF NOT EXISTS access_method TEXT NOT NULL DEFAULT 'pin',
      ADD COLUMN IF NOT EXISTS config_encrypted TEXT,
      ADD COLUMN IF NOT EXISTS config_meta JSONB DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS battery_level SMALLINT,
      ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_smart_locks_entity_active ON public.smart_locks(entity_id) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_smart_locks_room ON public.smart_locks(room_id) WHERE room_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.lock_access_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lock_id UUID NOT NULL REFERENCES public.smart_locks(id) ON DELETE CASCADE,
  reservation_id UUID,
  pin_code TEXT,
  pin_provider_id TEXT,
  valid_from TIMESTAMPTZ NOT NULL,
  valid_to TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked','expired')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_lock_access_codes_lock ON public.lock_access_codes(lock_id);
CREATE INDEX IF NOT EXISTS idx_lock_access_codes_reservation ON public.lock_access_codes(reservation_id) WHERE reservation_id IS NOT NULL;

ALTER TABLE public.smart_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lock_access_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "smart_locks_all" ON public.smart_locks;
DROP POLICY IF EXISTS "smart_locks_all" ON public.smart_locks;
CREATE POLICY "smart_locks_all" ON public.smart_locks
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.entities e WHERE e.id = smart_locks.entity_id
            AND (e.tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.entities e WHERE e.id = smart_locks.entity_id
            AND (e.tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin()))
  );

DROP POLICY IF EXISTS "lock_access_codes_all" ON public.lock_access_codes;
CREATE POLICY "lock_access_codes_all" ON public.lock_access_codes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.smart_locks l
            JOIN public.entities e ON e.id = l.entity_id
            WHERE l.id = lock_access_codes.lock_id
              AND (e.tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.smart_locks l
            JOIN public.entities e ON e.id = l.entity_id
            WHERE l.id = lock_access_codes.lock_id
              AND (e.tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin()))
  );

DROP TRIGGER IF EXISTS set_smart_locks_updated_at ON public.smart_locks;
CREATE TRIGGER set_smart_locks_updated_at BEFORE UPDATE ON public.smart_locks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- DYNAMIC PRICING engine
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('occupancy_based','lead_time','day_of_week','season','event','competitor','last_minute','early_bird')),
  name TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('percent','fixed')),
  adjustment_value NUMERIC(10,2) NOT NULL,
  priority INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  applies_to_room_types UUID[] DEFAULT '{}',
  valid_from DATE,
  valid_to DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pricing_rules_entity ON public.pricing_rules(entity_id) WHERE active = TRUE;

CREATE TABLE IF NOT EXISTS public.pricing_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  room_type_id UUID,
  rate_plan_id UUID,
  service_date DATE NOT NULL,
  current_price NUMERIC(10,2),
  suggested_price NUMERIC(10,2) NOT NULL,
  confidence_pct SMALLINT,
  reason TEXT,
  applied BOOLEAN NOT NULL DEFAULT FALSE,
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (entity_id, room_type_id, rate_plan_id, service_date)
);

CREATE INDEX IF NOT EXISTS idx_pricing_suggestions_entity_date ON public.pricing_suggestions(entity_id, service_date);

ALTER TABLE public.pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_suggestions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pricing_rules_all" ON public.pricing_rules;
CREATE POLICY "pricing_rules_all" ON public.pricing_rules
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.entities e WHERE e.id = pricing_rules.entity_id
            AND (e.tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.entities e WHERE e.id = pricing_rules.entity_id
            AND (e.tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin()))
  );

DROP POLICY IF EXISTS "pricing_suggestions_all" ON public.pricing_suggestions;
CREATE POLICY "pricing_suggestions_all" ON public.pricing_suggestions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.entities e WHERE e.id = pricing_suggestions.entity_id
            AND (e.tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.entities e WHERE e.id = pricing_suggestions.entity_id
            AND (e.tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin()))
  );

DROP TRIGGER IF EXISTS set_pricing_rules_updated_at ON public.pricing_rules;
CREATE TRIGGER set_pricing_rules_updated_at BEFORE UPDATE ON public.pricing_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- GUEST PORTAL (token-based access post-booking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.guest_portal_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_count INT NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_guest_portal_tokens_lookup ON public.guest_portal_tokens(token);
CREATE INDEX IF NOT EXISTS idx_guest_portal_tokens_reservation ON public.guest_portal_tokens(reservation_id);

CREATE TABLE IF NOT EXISTS public.upsell_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  reservation_id UUID,
  guest_id UUID,
  service_code TEXT NOT NULL,
  service_name TEXT NOT NULL,
  qty SMALLINT NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL,
  total_amount NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','delivered','cancelled','refunded')),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending','paid','refunded')),
  stripe_intent_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_upsell_orders_entity ON public.upsell_orders(entity_id);
CREATE INDEX IF NOT EXISTS idx_upsell_orders_reservation ON public.upsell_orders(reservation_id) WHERE reservation_id IS NOT NULL;

ALTER TABLE public.guest_portal_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upsell_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "guest_portal_tokens_all" ON public.guest_portal_tokens;
CREATE POLICY "guest_portal_tokens_all" ON public.guest_portal_tokens
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.reservations r
            JOIN public.entities e ON e.id = r.entity_id
            WHERE r.id = guest_portal_tokens.reservation_id
              AND (e.tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.reservations r
            JOIN public.entities e ON e.id = r.entity_id
            WHERE r.id = guest_portal_tokens.reservation_id
              AND (e.tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin()))
  );

DROP POLICY IF EXISTS "upsell_orders_all" ON public.upsell_orders;
CREATE POLICY "upsell_orders_all" ON public.upsell_orders
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.entities e WHERE e.id = upsell_orders.entity_id
            AND (e.tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.entities e WHERE e.id = upsell_orders.entity_id
            AND (e.tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin()))
  );

DROP TRIGGER IF EXISTS set_upsell_orders_updated_at ON public.upsell_orders;
CREATE TRIGGER set_upsell_orders_updated_at BEFORE UPDATE ON public.upsell_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- REVIEWS aggregator
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='reviews') THEN
    CREATE TABLE public.reviews (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      entity_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
      reservation_id UUID,
      guest_id UUID,
      source TEXT NOT NULL,
      external_id TEXT,
      rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
      title TEXT,
      body TEXT,
      language TEXT,
      reviewer_name TEXT,
      reviewer_country TEXT,
      reply_body TEXT,
      reply_at TIMESTAMPTZ,
      reply_by_user_id UUID REFERENCES auth.users(id),
      sentiment TEXT,
      topics TEXT[] DEFAULT '{}',
      visible BOOLEAN NOT NULL DEFAULT TRUE,
      flagged BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (entity_id, source, external_id)
    );
  ELSE
    ALTER TABLE public.reviews
      ADD COLUMN IF NOT EXISTS reply_body TEXT,
      ADD COLUMN IF NOT EXISTS reply_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS reply_by_user_id UUID,
      ADD COLUMN IF NOT EXISTS sentiment TEXT,
      ADD COLUMN IF NOT EXISTS topics TEXT[] DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS flagged BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS reviewer_country TEXT,
      ADD COLUMN IF NOT EXISTS reservation_id UUID,
      ADD COLUMN IF NOT EXISTS guest_id UUID;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_reviews_entity ON public.reviews(entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_unreplied ON public.reviews(entity_id) WHERE reply_at IS NULL;

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reviews_all" ON public.reviews;
CREATE POLICY "reviews_all" ON public.reviews
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.entities e WHERE e.id = reviews.entity_id
            AND (e.tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.entities e WHERE e.id = reviews.entity_id
            AND (e.tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin()))
  );

DROP TRIGGER IF EXISTS set_reviews_updated_at ON public.reviews;
CREATE TRIGGER set_reviews_updated_at BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- LOYALTY program
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.loyalty_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  points_per_eur NUMERIC(6,2) NOT NULL DEFAULT 1,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.loyalty_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES public.loyalty_programs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  min_points INT NOT NULL DEFAULT 0,
  benefits JSONB NOT NULL DEFAULT '[]'::jsonb,
  color_hex TEXT,
  order_idx INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.guest_loyalty (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id UUID NOT NULL,
  program_id UUID NOT NULL REFERENCES public.loyalty_programs(id) ON DELETE CASCADE,
  current_tier_id UUID REFERENCES public.loyalty_tiers(id) ON DELETE SET NULL,
  points_balance INT NOT NULL DEFAULT 0,
  points_earned_total INT NOT NULL DEFAULT 0,
  points_redeemed_total INT NOT NULL DEFAULT 0,
  last_activity_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (guest_id, program_id)
);

CREATE TABLE IF NOT EXISTS public.loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_loyalty_id UUID NOT NULL REFERENCES public.guest_loyalty(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('earn','redeem','adjust','expire')),
  points INT NOT NULL,
  source_type TEXT,
  source_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_guest ON public.loyalty_transactions(guest_loyalty_id, created_at DESC);

ALTER TABLE public.loyalty_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_loyalty ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "loyalty_programs_all" ON public.loyalty_programs;
CREATE POLICY "loyalty_programs_all" ON public.loyalty_programs
  FOR ALL USING (tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin())
  WITH CHECK (tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin());

DROP POLICY IF EXISTS "loyalty_tiers_all" ON public.loyalty_tiers;
CREATE POLICY "loyalty_tiers_all" ON public.loyalty_tiers
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.loyalty_programs p WHERE p.id = loyalty_tiers.program_id
            AND (p.tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.loyalty_programs p WHERE p.id = loyalty_tiers.program_id
            AND (p.tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin()))
  );

DROP POLICY IF EXISTS "guest_loyalty_all" ON public.guest_loyalty;
CREATE POLICY "guest_loyalty_all" ON public.guest_loyalty
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.loyalty_programs p WHERE p.id = guest_loyalty.program_id
            AND (p.tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.loyalty_programs p WHERE p.id = guest_loyalty.program_id
            AND (p.tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin()))
  );

DROP POLICY IF EXISTS "loyalty_transactions_all" ON public.loyalty_transactions;
CREATE POLICY "loyalty_transactions_all" ON public.loyalty_transactions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.guest_loyalty gl
            JOIN public.loyalty_programs p ON p.id = gl.program_id
            WHERE gl.id = loyalty_transactions.guest_loyalty_id
              AND (p.tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.guest_loyalty gl
            JOIN public.loyalty_programs p ON p.id = gl.program_id
            WHERE gl.id = loyalty_transactions.guest_loyalty_id
              AND (p.tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin()))
  );

DROP TRIGGER IF EXISTS set_loyalty_programs_updated_at ON public.loyalty_programs;
CREATE TRIGGER set_loyalty_programs_updated_at BEFORE UPDATE ON public.loyalty_programs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS set_guest_loyalty_updated_at ON public.guest_loyalty;
CREATE TRIGGER set_guest_loyalty_updated_at BEFORE UPDATE ON public.guest_loyalty
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
