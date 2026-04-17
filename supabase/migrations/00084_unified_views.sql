-- 00084: Views cross-vertical per reporting unificato
-- 1. Hospitality KPI views (mancanti)
-- 2. Cross-vertical revenue unified
-- 3. Tenant consolidated dashboard
-- 4. Agency-level aggregato

-- ============================================================================
-- 1. HOSPITALITY KPI views (equivalenti restaurant)
-- ============================================================================

CREATE OR REPLACE VIEW public.v_hospitality_kpi_daily
WITH (security_invoker = true) AS
SELECT
  e.tenant_id,
  e.id AS entity_id,
  date_trunc('day', r.created_at)::date AS service_date,
  COUNT(DISTINCT r.id) AS bookings_count,
  COALESCE(SUM(r.adults + COALESCE(r.children, 0)), 0) AS total_guests,
  COALESCE(SUM(r.total_amount), 0) AS revenue,
  COALESCE(AVG(r.total_amount) FILTER (WHERE r.status IN ('confirmed','checked_in','checked_out')), 0) AS avg_booking_value,
  COUNT(DISTINCT CASE WHEN r.status = 'cancelled' THEN r.id END) AS cancelled_count,
  COUNT(DISTINCT CASE WHEN r.status = 'no_show' THEN r.id END) AS no_show_count
FROM public.entities e
JOIN public.reservations r ON r.entity_id = e.id
WHERE e.kind = 'accommodation'
  AND (e.tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin())
GROUP BY e.tenant_id, e.id, date_trunc('day', r.created_at)::date;

GRANT SELECT ON public.v_hospitality_kpi_daily TO authenticated;

-- Occupancy view (room-level basato su rooms count come total_units)
CREATE OR REPLACE VIEW public.v_hospitality_occupancy_daily
WITH (security_invoker = true) AS
WITH room_counts AS (
  SELECT entity_id, COUNT(*) AS total_rooms
  FROM public.rooms
  WHERE is_active = TRUE
  GROUP BY entity_id
),
date_series AS (
  SELECT generate_series(CURRENT_DATE - INTERVAL '90 days', CURRENT_DATE + INTERVAL '180 days', '1 day')::date AS service_date
)
SELECT
  e.tenant_id,
  e.id AS entity_id,
  ds.service_date,
  COALESCE(rc.total_rooms, 0) AS total_rooms,
  COALESCE(occ.occupied_rooms, 0) AS occupied_rooms,
  CASE WHEN COALESCE(rc.total_rooms, 0) > 0
       THEN ROUND((COALESCE(occ.occupied_rooms, 0)::NUMERIC / rc.total_rooms::NUMERIC) * 100, 2)
       ELSE 0 END AS occupancy_pct
FROM public.entities e
CROSS JOIN date_series ds
LEFT JOIN room_counts rc ON rc.entity_id = e.id
LEFT JOIN LATERAL (
  SELECT COUNT(DISTINCT res.room_id) AS occupied_rooms
  FROM public.reservations res
  WHERE res.entity_id = e.id
    AND res.status IN ('confirmed','checked_in','checked_out')
    AND ds.service_date >= res.check_in
    AND ds.service_date < res.check_out
) occ ON TRUE
WHERE e.kind = 'accommodation'
  AND (e.tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin());

GRANT SELECT ON public.v_hospitality_occupancy_daily TO authenticated;

-- Revenue per room type
CREATE OR REPLACE VIEW public.v_hospitality_revenue_by_room_type
WITH (security_invoker = true) AS
SELECT
  e.tenant_id,
  e.id AS entity_id,
  rt.id AS room_type_id,
  rt.name AS room_type_name,
  COUNT(DISTINCT r.id) AS bookings_count,
  COALESCE(SUM(r.total_amount), 0) AS revenue,
  COALESCE(AVG(r.total_amount), 0) AS adr,
  COALESCE(SUM((r.check_out - r.check_in)), 0) AS room_nights_sold
FROM public.entities e
JOIN public.room_types rt ON rt.entity_id = e.id
LEFT JOIN public.reservations r ON r.room_type_id = rt.id AND r.status IN ('confirmed','checked_in','checked_out')
WHERE e.kind = 'accommodation'
  AND (e.tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin())
GROUP BY e.tenant_id, e.id, rt.id, rt.name;

GRANT SELECT ON public.v_hospitality_revenue_by_room_type TO authenticated;

-- ============================================================================
-- 2. UNIFIED REVENUE: cross-vertical (hospitality + restaurant)
-- ============================================================================

CREATE OR REPLACE VIEW public.v_revenue_unified
WITH (security_invoker = true) AS
SELECT
  tenant_id,
  entity_id,
  vertical,
  service_date,
  SUM(revenue)::NUMERIC(12,2) AS revenue,
  SUM(transactions_count)::INT AS transactions_count
FROM (
  -- Hospitality from reservations
  SELECT
    e.tenant_id,
    e.id AS entity_id,
    'hospitality' AS vertical,
    date_trunc('day', r.created_at)::date AS service_date,
    COALESCE(r.total_amount, 0) AS revenue,
    1 AS transactions_count
  FROM public.entities e
  JOIN public.reservations r ON r.entity_id = e.id
  WHERE e.kind = 'accommodation'
    AND r.status IN ('confirmed','checked_in','checked_out')
    AND (e.tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin())

  UNION ALL

  -- Restaurant from orders
  SELECT
    rest.tenant_id,
    rest.id AS entity_id,
    'restaurant' AS vertical,
    date_trunc('day', ro.opened_at)::date AS service_date,
    COALESCE(ro.total, 0) AS revenue,
    1 AS transactions_count
  FROM public.restaurants rest
  JOIN public.restaurant_orders ro ON ro.restaurant_id = rest.id
  WHERE ro.status = 'closed'
    AND (rest.tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin())
) combined
GROUP BY tenant_id, entity_id, vertical, service_date;

GRANT SELECT ON public.v_revenue_unified TO authenticated;

-- ============================================================================
-- 3. TENANT consolidated dashboard
-- ============================================================================

CREATE OR REPLACE VIEW public.v_tenant_consolidated_kpi
WITH (security_invoker = true) AS
SELECT
  tenant_id,
  service_date,
  SUM(revenue) FILTER (WHERE vertical = 'hospitality')::NUMERIC(12,2) AS revenue_hospitality,
  SUM(revenue) FILTER (WHERE vertical = 'restaurant')::NUMERIC(12,2) AS revenue_restaurant,
  SUM(revenue)::NUMERIC(12,2) AS revenue_total,
  SUM(transactions_count) FILTER (WHERE vertical = 'hospitality')::INT AS bookings_hospitality,
  SUM(transactions_count) FILTER (WHERE vertical = 'restaurant')::INT AS orders_restaurant,
  COUNT(DISTINCT entity_id) AS entities_active
FROM public.v_revenue_unified
GROUP BY tenant_id, service_date;

GRANT SELECT ON public.v_tenant_consolidated_kpi TO authenticated;

-- ============================================================================
-- 4. AGENCY consolidated (per-tenant aggregato cross-vertical per agency)
-- ============================================================================

CREATE OR REPLACE VIEW public.v_agency_consolidated_kpi
WITH (security_invoker = true) AS
SELECT
  atl.agency_id,
  atl.tenant_id,
  t.name AS tenant_name,
  v.service_date,
  COALESCE(v.revenue_total, 0) AS revenue_total,
  COALESCE(v.revenue_hospitality, 0) AS revenue_hospitality,
  COALESCE(v.revenue_restaurant, 0) AS revenue_restaurant,
  COALESCE(v.bookings_hospitality, 0) AS bookings_hospitality,
  COALESCE(v.orders_restaurant, 0) AS orders_restaurant,
  COALESCE(v.entities_active, 0) AS entities_active
FROM public.agency_tenant_links atl
JOIN public.tenants t ON t.id = atl.tenant_id
LEFT JOIN public.v_tenant_consolidated_kpi v ON v.tenant_id = atl.tenant_id
WHERE atl.status = 'active'
  AND (atl.agency_id = ANY(get_user_agency_ids()) OR is_platform_admin());

GRANT SELECT ON public.v_agency_consolidated_kpi TO authenticated;

-- ============================================================================
-- 5. DOCUMENTS revenue summary (cross-vertical via documents unified)
-- ============================================================================

CREATE OR REPLACE VIEW public.v_documents_revenue_summary
WITH (security_invoker = true) AS
SELECT
  tenant_id,
  vertical,
  document_type,
  date_trunc('month', document_date)::date AS month,
  COUNT(*) AS documents_count,
  SUM(amount_subtotal) AS subtotal_total,
  SUM(amount_vat) AS vat_total,
  SUM(amount_total) AS total_revenue,
  SUM(amount_total) FILTER (WHERE payment_status = 'paid') AS paid_amount,
  SUM(amount_total) FILTER (WHERE payment_status IN ('pending','partial')) AS unpaid_amount
FROM public.documents
WHERE (tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin())
GROUP BY tenant_id, vertical, document_type, date_trunc('month', document_date)::date;

GRANT SELECT ON public.v_documents_revenue_summary TO authenticated;
