-- 00057: Booking engine customization
-- - accommodations.booking_theme: tokens per template + colori/font/logo
-- - public_booking_keys: API key pubblica per embed esterni (scope limitato)

-- =========================================================================
-- 1. Theme tokens su accommodations.settings → colonna dedicata
-- =========================================================================

ALTER TABLE accommodations
  ADD COLUMN IF NOT EXISTS booking_template text NOT NULL DEFAULT 'minimal'
    CHECK (booking_template IN ('minimal','luxury','mobile')),
  ADD COLUMN IF NOT EXISTS booking_theme jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN accommodations.booking_template IS 'Template default booking engine: minimal | luxury | mobile';
COMMENT ON COLUMN accommodations.booking_theme IS 'Theme tokens: { accent_color, bg_color, text_color, border_radius, font_family, logo_url, hero_image_url, custom_css }';

-- =========================================================================
-- 2. Public booking API keys (per embed su domini esterni)
-- =========================================================================

CREATE TABLE IF NOT EXISTS public_booking_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id uuid NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  key_prefix text NOT NULL,                       -- visibile "pbk_abc12345"
  key_hash text NOT NULL,                         -- sha256 della key completa
  name text NOT NULL,                             -- "Sito ufficiale", "Widget partner X"
  allowed_domains text[] NOT NULL DEFAULT '{}',   -- CORS whitelist: ['hotel-example.com']
  scopes text[] NOT NULL DEFAULT '{availability.read,booking.create}',
  is_active boolean NOT NULL DEFAULT true,
  last_used_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_public_booking_keys_entity ON public_booking_keys(entity_id) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_public_booking_keys_prefix ON public_booking_keys(key_prefix) WHERE is_active;

COMMENT ON TABLE public_booking_keys IS 'Chiavi API pubbliche per booking engine embed su domini esterni. Scope limitato a availability.read / booking.create.';

-- RLS: admin del tenant può gestirle, nessuno può leggere key_hash
ALTER TABLE public_booking_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS public_booking_keys_owner ON public_booking_keys;
CREATE POLICY public_booking_keys_owner ON public_booking_keys
  FOR ALL TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM memberships
      WHERE user_id = auth.uid() AND role IN ('owner','admin')
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM memberships
      WHERE user_id = auth.uid() AND role IN ('owner','admin')
    )
  );

-- =========================================================================
-- 3. Embed domain logs (per analytics + rate limiting)
-- =========================================================================

CREATE TABLE IF NOT EXISTS embed_request_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id uuid REFERENCES entities(id) ON DELETE CASCADE,
  api_key_id uuid REFERENCES public_booking_keys(id) ON DELETE SET NULL,
  origin text,
  path text,
  status_code int,
  user_agent text,
  ip_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_embed_logs_entity_date ON embed_request_logs(entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_embed_logs_key ON embed_request_logs(api_key_id, created_at DESC);
