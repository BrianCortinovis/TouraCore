-- 00091: Public read-only views for accommodation + restaurant vertical data.
--
-- Safe-for-anon projections of accommodations + restaurants, filtered by
-- public_listings.is_public = true. Exposes only SEO / public-facing columns;
-- drops fiscal/legal fields (vat_number, fiscal_code, legal_details, ecc).

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
  a.default_currency
FROM public.accommodations a
JOIN public.public_listings pl ON pl.entity_id = a.entity_id AND pl.is_public = true;

GRANT SELECT ON public.public_accommodation_view TO anon, authenticated;

COMMENT ON VIEW public.public_accommodation_view IS
  'Anon-safe projection of accommodations joined with public_listings is_public=true. Excludes fiscal/legal columns.';

CREATE OR REPLACE VIEW public.public_restaurant_view
WITH (security_invoker = false) AS
SELECT
  r.id,
  r.cuisine_type,
  r.price_range,
  r.capacity_total,
  r.avg_turn_minutes,
  r.opening_hours,
  r.reservation_mode,
  r.services
FROM public.restaurants r
JOIN public.public_listings pl ON pl.entity_id = r.id AND pl.is_public = true;

GRANT SELECT ON public.public_restaurant_view TO anon, authenticated;

COMMENT ON VIEW public.public_restaurant_view IS
  'Anon-safe projection of restaurants joined with public_listings is_public=true. Excludes deposit/tax config.';
