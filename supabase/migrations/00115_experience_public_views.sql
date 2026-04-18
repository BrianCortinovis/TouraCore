-- 00115: Public views + manifest view + add 'experience' to listing_distribution + credit_instruments
-- Modulo: Experience M058 + M057

CREATE OR REPLACE VIEW public.public_experience_entities AS
SELECT
  e.id, e.tenant_id, e.slug, e.name, e.description, e.short_description,
  ex.category, ex.city, ex.address, ex.zip, ex.country, ex.latitude, ex.longitude,
  ex.languages, ex.age_min_default, ex.height_min_cm_default, ex.difficulty_default,
  ex.opening_hours
FROM public.entities e
JOIN public.experience_entities ex ON ex.id = e.id
WHERE e.kind = 'activity' AND e.is_active = TRUE;

GRANT SELECT ON public.public_experience_entities TO anon, authenticated;

CREATE OR REPLACE VIEW public.public_experience_products AS
SELECT
  p.id, p.entity_id, p.tenant_id, p.slug, p.name, p.description_md,
  p.booking_mode, p.duration_minutes, p.capacity_default,
  p.age_min, p.age_max, p.height_min_cm, p.difficulty, p.languages,
  p.price_base_cents, p.currency, p.vat_rate,
  p.images, p.highlights, p.includes, p.excludes, p.requirements,
  p.meeting_point, p.waiver_required, p.cutoff_minutes,
  e.slug AS entity_slug, e.name AS entity_name
FROM public.experience_products p
JOIN public.entities e ON e.id = p.entity_id
WHERE p.status = 'active' AND e.is_active = TRUE;

GRANT SELECT ON public.public_experience_products TO anon, authenticated;

CREATE OR REPLACE VIEW public.public_experience_variants AS
SELECT id, product_id, tenant_id, code, label, kind, price_cents, includes_capacity, min_qty, max_qty, display_order
FROM public.experience_variants WHERE active = TRUE ORDER BY display_order;
GRANT SELECT ON public.public_experience_variants TO anon, authenticated;

CREATE OR REPLACE VIEW public.public_experience_timeslots AS
SELECT id, product_id, tenant_id, start_at, end_at,
  capacity_total, capacity_booked, capacity_held,
  (capacity_total - capacity_booked - capacity_held) AS capacity_available,
  status, price_override_cents
FROM public.experience_timeslots
WHERE status = 'open' AND start_at > NOW();
GRANT SELECT ON public.public_experience_timeslots TO anon, authenticated;

CREATE OR REPLACE VIEW public.experience_manifest_view AS
SELECT
  r.id AS reservation_id, r.tenant_id, r.entity_id, r.product_id, r.timeslot_id,
  r.reference_code, r.customer_name, r.customer_email, r.customer_phone,
  r.start_at, r.end_at, r.guests_count, r.status, r.payment_status,
  r.pickup_address, r.notes, r.source,
  p.name AS product_name, p.booking_mode, p.meeting_point,
  e.name AS entity_name,
  (SELECT json_agg(json_build_object('first_name', g.first_name, 'last_name', g.last_name, 'variant_code', v.code, 'waiver_signed', g.waiver_signed_at IS NOT NULL, 'checked_in', g.checked_in_at IS NOT NULL, 'qr', g.check_in_qr))
   FROM public.experience_reservation_guests g
   LEFT JOIN public.experience_variants v ON v.id = g.variant_id
   WHERE g.reservation_id = r.id) AS guests
FROM public.experience_reservations r
JOIN public.experience_products p ON p.id = r.product_id
JOIN public.entities e ON e.id = r.entity_id;

GRANT SELECT ON public.experience_manifest_view TO authenticated;

-- Extend credit_instruments e partners per vertical='experiences' (già supportato da 00102+00103)
-- Extend documents_unified (già in 00082 con vertical='experiences')
