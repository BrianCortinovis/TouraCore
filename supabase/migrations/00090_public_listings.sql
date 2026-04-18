-- 00090: Public listings foundation
--
-- Scheda pubblica (listing) 1:1 con entity. Contiene SOLO campi "curation":
-- - is_public toggle
-- - hero + tagline + featured amenities per editoriale
-- - SEO override (title/description/og_image)
-- - slug_override (fallback su entities.slug)
--
-- La descrizione canonica e i servizi restano in entities/accommodations/restaurants:
-- il listing NON duplica, solo cura.
--
-- RLS: tenant-members own rows. Public (anon) NON vede raw table. Solo via
-- public_listings_view che filtra colonne e righe (is_public=true).

CREATE TABLE IF NOT EXISTS public.public_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL UNIQUE REFERENCES public.entities(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

  is_public BOOLEAN NOT NULL DEFAULT false,

  slug_override TEXT,
  hero_media_id UUID REFERENCES public.media(id) ON DELETE SET NULL,
  tagline TEXT,
  featured_amenities TEXT[] DEFAULT '{}'::text[],

  seo_title TEXT,
  seo_description TEXT,
  og_image_url TEXT,

  published_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_public_listings_tenant_public
  ON public.public_listings(tenant_id, is_public);
CREATE INDEX IF NOT EXISTS idx_public_listings_entity
  ON public.public_listings(entity_id);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.touch_public_listings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  IF NEW.is_public AND (OLD.is_public IS DISTINCT FROM NEW.is_public) THEN
    NEW.published_at := COALESCE(NEW.published_at, now());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_public_listings_updated_at ON public.public_listings;
CREATE TRIGGER trg_public_listings_updated_at
  BEFORE UPDATE ON public.public_listings
  FOR EACH ROW EXECUTE FUNCTION public.touch_public_listings_updated_at();

-- RLS: tenant members only
ALTER TABLE public.public_listings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pl_tenant_select ON public.public_listings;
CREATE POLICY pl_tenant_select ON public.public_listings
  FOR SELECT USING (tenant_id = ANY(get_user_tenant_ids()));

DROP POLICY IF EXISTS pl_tenant_insert ON public.public_listings;
CREATE POLICY pl_tenant_insert ON public.public_listings
  FOR INSERT WITH CHECK (tenant_id = ANY(get_user_tenant_ids()));

DROP POLICY IF EXISTS pl_tenant_update ON public.public_listings;
CREATE POLICY pl_tenant_update ON public.public_listings
  FOR UPDATE USING (tenant_id = ANY(get_user_tenant_ids()))
  WITH CHECK (tenant_id = ANY(get_user_tenant_ids()));

DROP POLICY IF EXISTS pl_tenant_delete ON public.public_listings;
CREATE POLICY pl_tenant_delete ON public.public_listings
  FOR DELETE USING (tenant_id = ANY(get_user_tenant_ids()));

-- Revoke direct access to anon. Anon reads via view only.
REVOKE ALL ON public.public_listings FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.public_listings TO authenticated;

-- Public view: filtered columns + rows (is_public=true)
CREATE OR REPLACE VIEW public.public_listings_view
WITH (security_invoker = false) AS
SELECT
  pl.id                                      AS listing_id,
  pl.entity_id,
  pl.tenant_id,
  t.slug                                     AS tenant_slug,
  t.name                                     AS tenant_name,
  e.kind                                     AS entity_kind,
  COALESCE(pl.slug_override, e.slug)         AS slug,
  e.name                                     AS entity_name,
  e.description                              AS entity_description,
  e.short_description                        AS entity_short_description,
  pl.tagline,
  pl.featured_amenities,
  pl.hero_media_id,
  m.url                                      AS hero_url,
  m.alt_text                                 AS hero_alt,
  pl.seo_title,
  pl.seo_description,
  pl.og_image_url,
  pl.published_at,
  pl.updated_at
FROM public.public_listings pl
JOIN public.entities e ON e.id = pl.entity_id AND e.is_active = true
JOIN public.tenants  t ON t.id = pl.tenant_id AND t.is_active = true
LEFT JOIN public.media m ON m.id = pl.hero_media_id
WHERE pl.is_public = true;

GRANT SELECT ON public.public_listings_view TO anon, authenticated;

COMMENT ON TABLE public.public_listings IS
  'Curation layer per listing pubblico. 1:1 con entities. Non duplica description/services, solo override editoriale (hero, tagline, featured, SEO).';
COMMENT ON VIEW public.public_listings_view IS
  'Read pubblico filtrato: solo listing is_public=true, solo colonne whitelist, join tenant+entity+media hero.';
