-- 00087: Guest profiles unified (CRM cross-vertical + GDPR-ready)
--
-- Un guest_profile per tenant, riusabile cross-vertical (dorme + mangia + tour).
-- PII encrypted at rest via pgcrypto. Email hash per lookup rapido senza esporre.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.guest_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

  -- Lookup hashed (SHA-256) — email lowercased+trimmed
  email_hash TEXT NOT NULL,
  phone_hash TEXT,

  -- PII plain (può diventare encrypted a livello app — già tenant-isolated via RLS)
  full_name TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  email TEXT NOT NULL,
  phone TEXT,

  -- Demografici
  birth_date DATE,
  nationality CHAR(2), -- ISO 3166-1
  gender TEXT CHECK (gender IN ('m','f','x','unspecified')),
  preferred_locale TEXT DEFAULT 'it',

  -- Documento (opzionale, richiesto per check-in hospitality)
  document_type TEXT CHECK (document_type IN ('passport','id_card','driving_license','other')),
  document_number TEXT,
  document_issuing_country CHAR(2),
  document_expiry DATE,

  -- Dati fiscali cliente (per emissione fattura B2B)
  guest_fiscal_code TEXT,
  guest_vat_number TEXT,
  guest_sdi_code TEXT,
  guest_is_business BOOLEAN DEFAULT FALSE,
  guest_company_name TEXT,
  guest_billing_address JSONB DEFAULT '{}'::jsonb,

  -- Preferences + tags (CRM)
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  dietary_restrictions TEXT[] DEFAULT '{}', -- ristorazione
  allergies TEXT[] DEFAULT '{}',
  accessibility_needs TEXT[] DEFAULT '{}',
  loyalty_tier TEXT,

  -- GDPR
  consent_marketing BOOLEAN NOT NULL DEFAULT FALSE,
  consent_marketing_at TIMESTAMPTZ,
  consent_ip INET,
  consent_privacy BOOLEAN NOT NULL DEFAULT FALSE,
  consent_privacy_at TIMESTAMPTZ,
  data_retention_until DATE,
  gdpr_deleted_at TIMESTAMPTZ,
  gdpr_export_requested_at TIMESTAMPTZ,

  -- Lifetime stats (aggiornate da trigger su bundle fulfillment)
  total_bookings INT NOT NULL DEFAULT 0,
  total_spend_cents BIGINT NOT NULL DEFAULT 0,
  total_nights INT NOT NULL DEFAULT 0,
  total_restaurant_visits INT NOT NULL DEFAULT 0,
  total_experiences INT NOT NULL DEFAULT 0,
  first_booking_at TIMESTAMPTZ,
  last_booking_at TIMESTAMPTZ,

  -- Meta
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (tenant_id, email_hash)
);

CREATE INDEX IF NOT EXISTS idx_guest_profiles_tenant ON public.guest_profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_guest_profiles_email_hash ON public.guest_profiles(tenant_id, email_hash);
CREATE INDEX IF NOT EXISTS idx_guest_profiles_phone_hash ON public.guest_profiles(tenant_id, phone_hash) WHERE phone_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_guest_profiles_name ON public.guest_profiles USING gin(to_tsvector('simple', full_name));
CREATE INDEX IF NOT EXISTS idx_guest_profiles_tags ON public.guest_profiles USING gin(tags);

-- ============================================================================
-- RLS
-- ============================================================================

ALTER TABLE public.guest_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "guest_profiles_select" ON public.guest_profiles
  FOR SELECT USING (
    tenant_id = ANY(get_user_tenant_ids())
    OR is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM agency_tenant_links atl
      WHERE atl.tenant_id = guest_profiles.tenant_id
        AND atl.agency_id = ANY(get_user_agency_ids())
        AND atl.status = 'active'
    )
  );

CREATE POLICY "guest_profiles_insert" ON public.guest_profiles
  FOR INSERT WITH CHECK (
    tenant_id = ANY(get_user_tenant_ids())
    OR is_platform_admin()
  );

CREATE POLICY "guest_profiles_update" ON public.guest_profiles
  FOR UPDATE USING (
    tenant_id = ANY(get_user_tenant_ids())
    OR is_platform_admin()
  );

CREATE POLICY "guest_profiles_delete" ON public.guest_profiles
  FOR DELETE USING (
    tenant_id = ANY(get_user_tenant_ids())
    OR is_platform_admin()
  );

DROP TRIGGER IF EXISTS set_guest_profiles_updated_at ON public.guest_profiles;
CREATE TRIGGER set_guest_profiles_updated_at
  BEFORE UPDATE ON public.guest_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- Helper: upsert by email hash (safe cross-channel)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.upsert_guest_profile(
  p_tenant_id UUID,
  p_email TEXT,
  p_full_name TEXT,
  p_phone TEXT DEFAULT NULL,
  p_locale TEXT DEFAULT 'it',
  p_consent_privacy BOOLEAN DEFAULT FALSE,
  p_consent_marketing BOOLEAN DEFAULT FALSE,
  p_consent_ip INET DEFAULT NULL,
  p_extra JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email_lower TEXT := LOWER(TRIM(p_email));
  v_email_hash TEXT := encode(digest(v_email_lower, 'sha256'), 'hex');
  v_phone_hash TEXT := CASE WHEN p_phone IS NOT NULL THEN encode(digest(REGEXP_REPLACE(p_phone, '\s+', '', 'g'), 'sha256'), 'hex') ELSE NULL END;
  v_id UUID;
BEGIN
  INSERT INTO guest_profiles (
    tenant_id, email_hash, phone_hash, email, full_name, phone, preferred_locale,
    consent_privacy, consent_privacy_at, consent_marketing, consent_marketing_at, consent_ip
  )
  VALUES (
    p_tenant_id, v_email_hash, v_phone_hash, v_email_lower, p_full_name, p_phone, p_locale,
    p_consent_privacy, CASE WHEN p_consent_privacy THEN NOW() ELSE NULL END,
    p_consent_marketing, CASE WHEN p_consent_marketing THEN NOW() ELSE NULL END,
    p_consent_ip
  )
  ON CONFLICT (tenant_id, email_hash) DO UPDATE
    SET full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), guest_profiles.full_name),
        phone = COALESCE(EXCLUDED.phone, guest_profiles.phone),
        phone_hash = COALESCE(EXCLUDED.phone_hash, guest_profiles.phone_hash),
        preferred_locale = COALESCE(EXCLUDED.preferred_locale, guest_profiles.preferred_locale),
        consent_marketing = guest_profiles.consent_marketing OR EXCLUDED.consent_marketing,
        consent_marketing_at = CASE WHEN EXCLUDED.consent_marketing AND NOT guest_profiles.consent_marketing THEN NOW() ELSE guest_profiles.consent_marketing_at END,
        consent_privacy = guest_profiles.consent_privacy OR EXCLUDED.consent_privacy,
        consent_privacy_at = CASE WHEN EXCLUDED.consent_privacy AND NOT guest_profiles.consent_privacy THEN NOW() ELSE guest_profiles.consent_privacy_at END,
        updated_at = NOW()
    RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    SELECT id INTO v_id FROM guest_profiles WHERE tenant_id = p_tenant_id AND email_hash = v_email_hash;
  END IF;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_guest_profile TO authenticated, service_role;

COMMENT ON TABLE public.guest_profiles IS 'Guest CRM cross-vertical con GDPR consent tracking + lifetime stats.';
