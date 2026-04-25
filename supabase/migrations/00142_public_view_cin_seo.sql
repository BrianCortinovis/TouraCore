-- 00142: Expose CIN code on public accommodation view for SEO + Italy compliance.
--
-- Italy D.L. 145/2023 art. 13-ter requires CIN (Codice Identificativo Nazionale)
-- to be visible on public booking pages. This migration adds cin_code column to
-- public_accommodation_view so it can be displayed on /s/[t]/[e] listing pages
-- and serialized into JSON-LD identifier (PropertyValue propertyID=CIN).
--
-- Additive: only adds a column already public-by-law. No security impact.

CREATE OR REPLACE VIEW public.public_accommodation_view
WITH (security_invoker = false) AS
SELECT
  a.entity_id,
  a.property_type,
  a.amenities,
  a.address,
  a.city,
  a.province,
  a.zip,
  a.country,
  a.region,
  a.email,
  a.phone,
  a.website,
  a.latitude,
  a.longitude,
  a.default_check_in_time AS check_in_time,
  a.default_check_out_time AS check_out_time,
  a.default_currency,
  a.cin_code
FROM public.accommodations a
JOIN public.public_listings pl ON pl.entity_id = a.entity_id AND pl.is_public = true;

GRANT SELECT ON public.public_accommodation_view TO anon, authenticated;

COMMENT ON VIEW public.public_accommodation_view IS
  'Anon-safe projection of accommodations joined with public_listings is_public=true. Includes cin_code (legally public per D.L.145/2023). Excludes fiscal/legal sensitive columns.';
