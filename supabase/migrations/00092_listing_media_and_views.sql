-- 00092: Listing media pivot + platform profile + portal discovery views
--
-- Parts:
--  A) listing_media: ordered photo gallery per listing (media already exists,
--     this pivots to listings so anons can fetch only listing photos)
--  B) platform_profiles: 1:1 auth.users personal homepage with intro text +
--     default booking mode (multi/singles/mixed)
--  C) platform_profile_listings: N:N profile ↔ listings (selected subset)
--  D) public_listing_photos_view: anon-safe gallery fetch
--  E) public_platform_profile_view: anon read profile by slug

-- ── A) listing_media ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.listing_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.public_listings(id) ON DELETE CASCADE,
  media_id UUID NOT NULL REFERENCES public.media(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_hero BOOLEAN NOT NULL DEFAULT false,
  caption TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(listing_id, media_id)
);

CREATE INDEX IF NOT EXISTS idx_listing_media_listing ON public.listing_media(listing_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_listing_media_tenant ON public.listing_media(tenant_id);

ALTER TABLE public.listing_media ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lm_tenant_all ON public.listing_media;
CREATE POLICY lm_tenant_all ON public.listing_media
  FOR ALL USING (tenant_id = ANY(get_user_tenant_ids()))
  WITH CHECK (tenant_id = ANY(get_user_tenant_ids()));

REVOKE ALL ON public.listing_media FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.listing_media TO authenticated;

-- Anon photos view (filter via is_public on listing)
CREATE OR REPLACE VIEW public.public_listing_photos_view
WITH (security_invoker = false) AS
SELECT
  lm.id,
  lm.listing_id,
  pl.entity_id,
  pl.tenant_id,
  lm.sort_order,
  lm.is_hero,
  lm.caption,
  m.url,
  m.alt_text,
  m.width,
  m.height
FROM public.listing_media lm
JOIN public.public_listings pl ON pl.id = lm.listing_id AND pl.is_public = true
JOIN public.media m ON m.id = lm.media_id
ORDER BY lm.sort_order ASC;

GRANT SELECT ON public.public_listing_photos_view TO anon, authenticated;

-- Anon media catalog (for admin picker we need authenticated, not anon)
-- (skip public media view; admin uses service_role via server action)

-- ── B) platform_profiles ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.platform_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,

  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  intro_headline TEXT,
  intro_description TEXT,

  -- Which booking engine(s) to expose on /u/[username]
  -- 'multi' = CTA big linking /book/multi/{tenantSlug}
  -- 'singles' = render one booking CTA per selected listing
  -- 'mixed' = both
  default_booking_mode TEXT NOT NULL DEFAULT 'multi'
    CHECK (default_booking_mode IN ('multi', 'singles', 'mixed')),

  avatar_media_id UUID REFERENCES public.media(id) ON DELETE SET NULL,
  social_links JSONB NOT NULL DEFAULT '{}'::jsonb,

  is_public BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_profiles_username ON public.platform_profiles(username) WHERE is_public = true;

ALTER TABLE public.platform_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pp_own_all ON public.platform_profiles;
CREATE POLICY pp_own_all ON public.platform_profiles
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

REVOKE ALL ON public.platform_profiles FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.platform_profiles TO authenticated;

-- ── C) platform_profile_listings ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.platform_profile_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.platform_profiles(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES public.public_listings(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  custom_label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(profile_id, listing_id)
);

CREATE INDEX IF NOT EXISTS idx_ppl_profile ON public.platform_profile_listings(profile_id, sort_order);

ALTER TABLE public.platform_profile_listings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ppl_own_all ON public.platform_profile_listings;
CREATE POLICY ppl_own_all ON public.platform_profile_listings
  FOR ALL USING (
    profile_id IN (SELECT id FROM public.platform_profiles WHERE user_id = auth.uid())
  )
  WITH CHECK (
    profile_id IN (SELECT id FROM public.platform_profiles WHERE user_id = auth.uid())
  );

REVOKE ALL ON public.platform_profile_listings FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.platform_profile_listings TO authenticated;

-- ── E) public_platform_profile_view ───────────────────────────────────
CREATE OR REPLACE VIEW public.public_platform_profile_view
WITH (security_invoker = false) AS
SELECT
  pp.id               AS profile_id,
  pp.username,
  pp.display_name,
  pp.intro_headline,
  pp.intro_description,
  pp.default_booking_mode,
  pp.avatar_media_id,
  m.url               AS avatar_url,
  pp.social_links,
  pp.tenant_id,
  t.slug              AS tenant_slug,
  t.name              AS tenant_name,
  pp.updated_at
FROM public.platform_profiles pp
LEFT JOIN public.media m ON m.id = pp.avatar_media_id
LEFT JOIN public.tenants t ON t.id = pp.tenant_id
WHERE pp.is_public = true;

GRANT SELECT ON public.public_platform_profile_view TO anon, authenticated;

-- Profile listings view (anon-safe, only for public profiles + public listings)
CREATE OR REPLACE VIEW public.public_profile_listings_view
WITH (security_invoker = false) AS
SELECT
  ppl.id              AS pivot_id,
  ppl.profile_id,
  ppl.sort_order,
  ppl.custom_label,
  plv.listing_id,
  plv.entity_id,
  plv.entity_kind,
  plv.tenant_slug,
  plv.slug,
  plv.entity_name,
  plv.tagline,
  plv.hero_url,
  plv.updated_at
FROM public.platform_profile_listings ppl
JOIN public.platform_profiles pp ON pp.id = ppl.profile_id AND pp.is_public = true
JOIN public.public_listings_view plv ON plv.listing_id = ppl.listing_id
ORDER BY ppl.sort_order ASC;

GRANT SELECT ON public.public_profile_listings_view TO anon, authenticated;

COMMENT ON TABLE public.listing_media IS 'Photo gallery pivot: N media per listing with ordering.';
COMMENT ON TABLE public.platform_profiles IS 'Personal homepage per auth user: intro text + booking mode + selected listings.';
COMMENT ON TABLE public.platform_profile_listings IS 'Subset of tenant listings the user chose to expose on /u/[username].';

-- Touch trigger for platform_profiles
CREATE OR REPLACE FUNCTION public.touch_platform_profile() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_touch_platform_profile ON public.platform_profiles;
CREATE TRIGGER trg_touch_platform_profile
  BEFORE UPDATE ON public.platform_profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_platform_profile();
