-- 00074: Restaurant analytics views + materialized aggregations
-- Modulo: Restaurant M028

CREATE OR REPLACE VIEW public.v_restaurant_kpi_daily AS
SELECT
  o.restaurant_id,
  date_trunc('day', o.opened_at)::date AS service_date,
  COUNT(DISTINCT o.id) AS orders_count,
  COALESCE(SUM(o.party_size), 0) AS covers,
  COALESCE(SUM(CASE WHEN o.status = 'closed' THEN o.total ELSE 0 END), 0) AS revenue,
  COALESCE(AVG(CASE WHEN o.status = 'closed' AND o.party_size > 0 THEN o.total / o.party_size END), 0) AS avg_per_cover,
  COALESCE(AVG(CASE WHEN o.status = 'closed' THEN o.total END), 0) AS avg_ticket,
  COUNT(DISTINCT CASE WHEN o.status = 'voided' THEN o.id END) AS voided_count
FROM public.restaurant_orders o
GROUP BY o.restaurant_id, date_trunc('day', o.opened_at)::date;

CREATE OR REPLACE VIEW public.v_restaurant_reservation_kpi AS
SELECT
  restaurant_id,
  slot_date,
  COUNT(*) AS reservations_total,
  COUNT(*) FILTER (WHERE status = 'no_show') AS no_show_count,
  COUNT(*) FILTER (WHERE status IN ('confirmed','seated','finished')) AS confirmed_count,
  COALESCE(SUM(party_size) FILTER (WHERE status IN ('seated','finished')), 0) AS covers_seated,
  COALESCE(SUM(party_size), 0) AS covers_booked,
  COALESCE(
    AVG(EXTRACT(EPOCH FROM (finished_at - seated_at)) / 60.0)
      FILTER (WHERE finished_at IS NOT NULL AND seated_at IS NOT NULL),
    0
  ) AS avg_turn_minutes_actual,
  COUNT(*) FILTER (WHERE source = 'widget') AS bookings_widget,
  COUNT(*) FILTER (WHERE source = 'thefork') AS bookings_thefork,
  COUNT(*) FILTER (WHERE source = 'walk_in') AS bookings_walkin
FROM public.restaurant_reservations
GROUP BY restaurant_id, slot_date;

-- Menu engineering Kasavana-Smith view
CREATE OR REPLACE VIEW public.v_menu_engineering AS
WITH item_sales AS (
  SELECT
    mi.id AS item_id,
    mi.restaurant_id,
    mi.name,
    mi.price_base,
    COALESCE(SUM(oi.qty) FILTER (WHERE oi.status NOT IN ('voided','open')), 0) AS units_sold,
    COALESCE(SUM(oi.qty * (oi.unit_price + oi.modifier_delta)) FILTER (WHERE oi.status NOT IN ('voided','open')), 0) AS revenue
  FROM public.menu_items mi
  LEFT JOIN public.order_items oi ON oi.menu_item_id = mi.id
  LEFT JOIN public.restaurant_orders ro ON ro.id = oi.order_id AND ro.opened_at >= NOW() - INTERVAL '30 days'
  WHERE mi.active = TRUE
  GROUP BY mi.id, mi.restaurant_id, mi.name, mi.price_base
),
totals AS (
  SELECT restaurant_id, SUM(units_sold) AS total_units
  FROM item_sales GROUP BY restaurant_id
)
SELECT
  s.item_id,
  s.restaurant_id,
  s.name,
  s.price_base,
  s.units_sold,
  s.revenue,
  CASE WHEN t.total_units > 0 THEN s.units_sold::NUMERIC / t.total_units ELSE 0 END AS popularity_pct,
  -- Margin proxy (no recipe cost yet): assume 30% food cost
  CASE WHEN s.price_base > 0 THEN ((s.price_base * 0.7) / s.price_base) ELSE 0 END AS margin_pct
FROM item_sales s
JOIN totals t ON t.restaurant_id = s.restaurant_id;

GRANT SELECT ON public.v_restaurant_kpi_daily TO authenticated;
GRANT SELECT ON public.v_restaurant_reservation_kpi TO authenticated;
GRANT SELECT ON public.v_menu_engineering TO authenticated;
