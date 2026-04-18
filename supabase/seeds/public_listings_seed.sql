-- Seed public_listings per tenant villa-irabo (briansnow86)
-- Idempotente: ON CONFLICT (entity_id) DO UPDATE

INSERT INTO public.public_listings (
  entity_id,
  tenant_id,
  is_public,
  tagline,
  featured_amenities,
  seo_title,
  seo_description
)
SELECT
  e.id,
  e.tenant_id,
  true,
  'Villa privata sul Lago di Como con piscina infinity e pontile riservato',
  ARRAY['pool','lake_view','private_dock','wifi','parking','concierge','breakfast','airco']::text[],
  'Villa Irabo — Suite Vista Lago · Bellagio, Lago di Como',
  'Dimora privata sul Lago di Como a Bellagio. Tre camere, 180 m², piscina infinity riscaldata, pontile privato, servizio concierge dedicato.'
FROM public.entities e
JOIN public.tenants t ON t.id = e.tenant_id
WHERE t.slug = 'villa-irabo' AND e.slug = 'villa-irabo' AND e.kind = 'accommodation'
ON CONFLICT (entity_id) DO UPDATE SET
  is_public = EXCLUDED.is_public,
  tagline = EXCLUDED.tagline,
  featured_amenities = EXCLUDED.featured_amenities,
  seo_title = EXCLUDED.seo_title,
  seo_description = EXCLUDED.seo_description,
  updated_at = now();

INSERT INTO public.public_listings (
  entity_id,
  tenant_id,
  is_public,
  tagline,
  featured_amenities,
  seo_title,
  seo_description
)
SELECT
  e.id,
  e.tenant_id,
  true,
  'Cucina lombarda contemporanea a Bellagio · Chef Paolo Rossi · 20 coperti',
  ARRAY['lake_view','outdoor_seating','wine_cellar','parking_nearby','vegan_menu','allergen_aware','private_dining']::text[],
  'Trattoria del Borgo — Cucina lombarda · Bellagio',
  'Trattoria del Borgo: cucina lombarda contemporanea firmata chef Paolo Rossi. Venti coperti, menu stagionale, carta dei vini selezionata con 130 etichette.'
FROM public.entities e
JOIN public.tenants t ON t.id = e.tenant_id
WHERE t.slug = 'villa-irabo' AND e.slug = 'trattoria-del-borgo' AND e.kind = 'restaurant'
ON CONFLICT (entity_id) DO UPDATE SET
  is_public = EXCLUDED.is_public,
  tagline = EXCLUDED.tagline,
  featured_amenities = EXCLUDED.featured_amenities,
  seo_title = EXCLUDED.seo_title,
  seo_description = EXCLUDED.seo_description,
  updated_at = now();
