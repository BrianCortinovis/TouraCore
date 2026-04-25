-- 00143: Public reviews aggregate view for SEO JSON-LD AggregateRating + Review.
--
-- Exposes anon-safe aggregate (avg, count) and a small projection of recent
-- visible reviews for entities that are public (public_listings.is_public=true).
-- Used by /s/[t]/[e] to enrich schema.org payload with aggregateRating + review.
-- No PII exposed beyond reviewer_name (already public-by-source on Booking/Google).

-- Reviews schema (cloud snapshot 2026-04-25): rating numeric, rating_scale numeric,
-- is_flagged boolean, flagged boolean, published_at timestamptz. We normalize
-- the rating to a 5-star scale via rating_scale and gate on both flag columns.

CREATE OR REPLACE VIEW public.public_review_aggregate_view
WITH (security_invoker = false) AS
SELECT
  r.entity_id,
  ROUND(
    AVG((r.rating::numeric / NULLIF(r.rating_scale, 0)::numeric) * 5)::numeric,
    2
  ) AS avg_rating,
  COUNT(*)::int AS review_count
FROM public.reviews r
JOIN public.public_listings pl ON pl.entity_id = r.entity_id AND pl.is_public = true
WHERE COALESCE(r.is_flagged, false) = false
  AND COALESCE(r.flagged, false) = false
  AND r.rating IS NOT NULL
GROUP BY r.entity_id;

GRANT SELECT ON public.public_review_aggregate_view TO anon, authenticated;

CREATE OR REPLACE VIEW public.public_review_view
WITH (security_invoker = false) AS
SELECT
  r.id,
  r.entity_id,
  ROUND(((r.rating::numeric / NULLIF(r.rating_scale, 0)::numeric) * 5)::numeric, 1)::int AS rating,
  r.title,
  r.body,
  r.reviewer_name,
  r.language,
  COALESCE(r.published_at, r.created_at) AS created_at
FROM public.reviews r
JOIN public.public_listings pl ON pl.entity_id = r.entity_id AND pl.is_public = true
WHERE COALESCE(r.is_flagged, false) = false
  AND COALESCE(r.flagged, false) = false
  AND r.rating IS NOT NULL;

GRANT SELECT ON public.public_review_view TO anon, authenticated;

COMMENT ON VIEW public.public_review_aggregate_view IS
  'Anon-safe avg+count of visible non-flagged reviews per entity, gated by public_listings.is_public.';
COMMENT ON VIEW public.public_review_view IS
  'Anon-safe projection of visible non-flagged reviews. No PII beyond reviewer_name (already public-by-source).';
