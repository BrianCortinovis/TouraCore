-- 00099: Public read-only views for bike_rental vertical data.
-- Anon-safe projections of bike_rentals + bike_types + bike_rental_addons + bike_locations
-- filtered by public_listings.is_public = true.

CREATE OR REPLACE VIEW public.public_bike_rental_view
WITH (security_invoker = false) AS
SELECT
  br.id AS entity_id,
  br.bike_types,
  br.capacity_total,
  br.avg_rental_hours,
  br.address,
  br.city,
  br.zip,
  br.country,
  br.latitude,
  br.longitude,
  br.opening_hours,
  br.delivery_config,
  br.one_way_config
FROM public.bike_rentals br
JOIN public.public_listings pl ON pl.entity_id = br.id AND pl.is_public = TRUE;

GRANT SELECT ON public.public_bike_rental_view TO anon, authenticated;

COMMENT ON VIEW public.public_bike_rental_view IS
  'Anon-safe projection of bike_rentals joined with public_listings is_public=true. Excludes deposit/insurance/agreement internals.';

-- Public bike_types (catalog con rates visibili)
CREATE OR REPLACE VIEW public.public_bike_types_view
WITH (security_invoker = false) AS
SELECT
  bt.id,
  bt.bike_rental_id,
  bt.type_key,
  bt.display_name,
  bt.description,
  bt.photo,
  bt.hourly_rate,
  bt.half_day_rate,
  bt.daily_rate,
  bt.weekly_rate,
  bt.deposit_amount,
  bt.age_min,
  bt.height_min,
  bt.height_max,
  bt.display_order
FROM public.bike_types bt
JOIN public.public_listings pl ON pl.entity_id = bt.bike_rental_id AND pl.is_public = TRUE
WHERE bt.active = TRUE;

GRANT SELECT ON public.public_bike_types_view TO anon, authenticated;

COMMENT ON VIEW public.public_bike_types_view IS
  'Anon-safe bike types catalog with base rates.';

-- Public addons (senza stock_total interno)
CREATE OR REPLACE VIEW public.public_bike_addons_view
WITH (security_invoker = false) AS
SELECT
  a.id,
  a.bike_rental_id,
  a.addon_key,
  a.display_name,
  a.description,
  a.category,
  a.pricing_mode,
  a.unit_price,
  a.mandatory_for,
  a.display_order
FROM public.bike_rental_addons a
JOIN public.public_listings pl ON pl.entity_id = a.bike_rental_id AND pl.is_public = TRUE
WHERE a.active = TRUE;

GRANT SELECT ON public.public_bike_addons_view TO anon, authenticated;

COMMENT ON VIEW public.public_bike_addons_view IS
  'Anon-safe addons catalog (safety/comfort/navigation/insurance/transport).';

-- Public locations (depositi visibili)
CREATE OR REPLACE VIEW public.public_bike_locations_view
WITH (security_invoker = false) AS
SELECT
  l.id,
  l.bike_rental_id,
  l.name,
  l.address,
  l.city,
  l.zip,
  l.country,
  l.latitude,
  l.longitude,
  l.opening_hours,
  l.is_pickup,
  l.is_return,
  l.display_order
FROM public.bike_locations l
JOIN public.public_listings pl ON pl.entity_id = l.bike_rental_id AND pl.is_public = TRUE
WHERE l.active = TRUE;

GRANT SELECT ON public.public_bike_locations_view TO anon, authenticated;

COMMENT ON VIEW public.public_bike_locations_view IS
  'Anon-safe depot/location catalog for bike rentals.';
