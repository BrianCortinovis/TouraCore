-- 00077: Production security hardening
-- Fix: views RLS leak, race conditions, encryption real, denormalize tenant_id, constraint missing
-- Affects: M021-M030 restaurant + core webhook idempotency

-- ============================================================================
-- 1. CRITICAL: Views security_invoker per evitare data leak cross-tenant
-- ============================================================================

DROP VIEW IF EXISTS public.v_restaurant_kpi_daily;
DROP VIEW IF EXISTS public.v_restaurant_reservation_kpi;
DROP VIEW IF EXISTS public.v_menu_engineering;

CREATE VIEW public.v_restaurant_kpi_daily
WITH (security_invoker = true) AS
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
WHERE o.restaurant_id = ANY(get_user_restaurant_ids()) OR is_platform_admin()
GROUP BY o.restaurant_id, date_trunc('day', o.opened_at)::date;

CREATE VIEW public.v_restaurant_reservation_kpi
WITH (security_invoker = true) AS
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
WHERE restaurant_id = ANY(get_user_restaurant_ids()) OR is_platform_admin()
GROUP BY restaurant_id, slot_date;

CREATE VIEW public.v_menu_engineering
WITH (security_invoker = true) AS
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
    AND (mi.restaurant_id = ANY(get_user_restaurant_ids()) OR is_platform_admin())
  GROUP BY mi.id, mi.restaurant_id, mi.name, mi.price_base
),
totals AS (
  SELECT restaurant_id, SUM(units_sold) AS total_units
  FROM item_sales GROUP BY restaurant_id
)
SELECT
  s.item_id, s.restaurant_id, s.name, s.price_base, s.units_sold, s.revenue,
  CASE WHEN t.total_units > 0 THEN s.units_sold::NUMERIC / t.total_units ELSE 0 END AS popularity_pct,
  CASE WHEN s.price_base > 0 THEN ((s.price_base * 0.7) / s.price_base) ELSE 0 END AS margin_pct
FROM item_sales s
JOIN totals t ON t.restaurant_id = s.restaurant_id;

GRANT SELECT ON public.v_restaurant_kpi_daily TO authenticated;
GRANT SELECT ON public.v_restaurant_reservation_kpi TO authenticated;
GRANT SELECT ON public.v_menu_engineering TO authenticated;

-- ============================================================================
-- 2. CRITICAL: linked_stay_reservation_id tenant validation trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_stay_reservation_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_stay_tenant UUID;
  v_rest_tenant UUID;
BEGIN
  IF NEW.linked_stay_reservation_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT e.tenant_id INTO v_stay_tenant
  FROM public.reservations r
  JOIN public.entities e ON e.id = r.entity_id
  WHERE r.id = NEW.linked_stay_reservation_id;

  SELECT tenant_id INTO v_rest_tenant
  FROM public.restaurants
  WHERE id = NEW.restaurant_id;

  IF v_stay_tenant IS DISTINCT FROM v_rest_tenant THEN
    RAISE EXCEPTION 'Tenant mismatch: stay reservation % does not belong to restaurant tenant', NEW.linked_stay_reservation_id
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_stay_reservation_tenant
  BEFORE INSERT OR UPDATE OF linked_stay_reservation_id, restaurant_id
  ON public.restaurant_reservations
  FOR EACH ROW EXECUTE FUNCTION validate_stay_reservation_tenant();

-- ============================================================================
-- 3. CRITICAL: folio_charges tenant validation (charge-to-room cross-tenant)
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_folio_charge_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_stay_tenant UUID;
  v_source_tenant UUID;
BEGIN
  -- Stay tenant
  SELECT e.tenant_id INTO v_stay_tenant
  FROM public.reservations r
  JOIN public.entities e ON e.id = r.entity_id
  WHERE r.id = NEW.reservation_id;

  -- Source tenant (se restaurant_order)
  IF NEW.source = 'restaurant_order' AND NEW.source_id IS NOT NULL THEN
    SELECT rest.tenant_id INTO v_source_tenant
    FROM public.restaurant_orders ro
    JOIN public.restaurants rest ON rest.id = ro.restaurant_id
    WHERE ro.id = NEW.source_id;

    IF v_source_tenant IS DISTINCT FROM v_stay_tenant THEN
      RAISE EXCEPTION 'Tenant mismatch on folio charge: stay vs restaurant_order'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_folio_charge_tenant
  BEFORE INSERT ON public.folio_charges
  FOR EACH ROW EXECUTE FUNCTION validate_folio_charge_tenant();

-- ============================================================================
-- 4. HIGH: UNIQUE constraint 1 ordine open per tavolo
-- ============================================================================

CREATE UNIQUE INDEX uk_restaurant_orders_one_active_per_table
  ON public.restaurant_orders (restaurant_id, table_id)
  WHERE status IN ('open', 'sent') AND table_id IS NOT NULL;

-- ============================================================================
-- 5. HIGH: PIN code hashing via pgcrypto
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions;

ALTER TABLE public.restaurant_staff
  ADD COLUMN IF NOT EXISTS pin_hash TEXT;

-- Hash existing pin_code se presente (one-time migration)
UPDATE public.restaurant_staff
SET pin_hash = extensions.crypt(pin_code, extensions.gen_salt('bf', 8))
WHERE pin_code IS NOT NULL AND pin_hash IS NULL;

-- Drop old plaintext column dopo migration completa (commentato per sicurezza, fai ALTER manualmente)
-- ALTER TABLE public.restaurant_staff DROP COLUMN pin_code;

-- Helper function verify PIN
CREATE OR REPLACE FUNCTION verify_staff_pin(p_restaurant_id UUID, p_pin TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_staff_id UUID;
BEGIN
  SELECT id INTO v_staff_id
  FROM public.restaurant_staff
  WHERE restaurant_id = p_restaurant_id
    AND active = TRUE
    AND pin_hash IS NOT NULL
    AND pin_hash = extensions.crypt(p_pin, pin_hash)
  LIMIT 1;
  RETURN v_staff_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION verify_staff_pin(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION verify_staff_pin(UUID, TEXT) TO authenticated, service_role;

-- ============================================================================
-- 6. HIGH: Idempotency key field dedicated (no più notes_staff hack)
-- ============================================================================

ALTER TABLE public.restaurant_reservations
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uk_restaurant_reservations_idempotency
  ON public.restaurant_reservations (restaurant_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- ============================================================================
-- 7. HIGH: Webhook events dedup table (Stripe + tutti webhooks)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  external_event_id TEXT NOT NULL,
  event_type TEXT,
  payload_hash TEXT,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'processed',
  UNIQUE (provider, external_event_id)
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_lookup
  ON public.webhook_events(provider, external_event_id);

ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- Solo platform admin può leggere webhook log; service_role bypass tramite admin client
CREATE POLICY "webhook_events_platform_admin" ON public.webhook_events
  FOR SELECT USING (is_platform_admin());

-- ============================================================================
-- 8. HIGH: Encryption columns per integrations config (sostituisce base64 fake)
-- ============================================================================

ALTER TABLE public.restaurant_integrations
  ADD COLUMN IF NOT EXISTS config_ciphertext BYTEA,
  ADD COLUMN IF NOT EXISTS config_iv BYTEA;

-- Helper: encrypt/decrypt con key da env (gestito a livello app via @touracore/security)
-- Questi sono solo container; la real encryption avviene in app code

-- ============================================================================
-- 9. HIGH: Denormalize restaurant_id su tabelle nested (perf RLS + data integrity)
-- ============================================================================

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS restaurant_id UUID;

UPDATE public.order_items oi
SET restaurant_id = ro.restaurant_id
FROM public.restaurant_orders ro
WHERE oi.order_id = ro.id AND oi.restaurant_id IS NULL;

ALTER TABLE public.order_items
  ALTER COLUMN restaurant_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_order_items_restaurant ON public.order_items(restaurant_id);

-- Ricreate RLS policy con restaurant_id diretto
DROP POLICY IF EXISTS "order_items_all" ON public.order_items;
CREATE POLICY "order_items_select" ON public.order_items
  FOR SELECT USING (restaurant_id = ANY(get_user_restaurant_ids()) OR is_platform_admin());
CREATE POLICY "order_items_insert" ON public.order_items
  FOR INSERT WITH CHECK (restaurant_id = ANY(get_user_restaurant_ids()) OR is_platform_admin());
CREATE POLICY "order_items_update" ON public.order_items
  FOR UPDATE USING (restaurant_id = ANY(get_user_restaurant_ids()) OR is_platform_admin());
CREATE POLICY "order_items_delete" ON public.order_items
  FOR DELETE USING (restaurant_id = ANY(get_user_restaurant_ids()) OR is_platform_admin());

-- Trigger auto-populate restaurant_id su INSERT
CREATE OR REPLACE FUNCTION populate_order_item_restaurant_id()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.restaurant_id IS NULL THEN
    SELECT restaurant_id INTO NEW.restaurant_id FROM public.restaurant_orders WHERE id = NEW.order_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_populate_order_item_restaurant_id
  BEFORE INSERT ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION populate_order_item_restaurant_id();

-- ============================================================================
-- 10. MEDIUM: Validation constraints
-- ============================================================================

-- Allergens UE su ingredients (stesso check di menu_items)
ALTER TABLE public.ingredients
  ADD CONSTRAINT chk_ingredients_allergens CHECK (
    allergens <@ ARRAY[
      'gluten','crustaceans','eggs','fish','peanuts','soybeans','milk','nuts',
      'celery','mustard','sesame','sulphites','lupin','molluscs'
    ]::TEXT[]
  );

-- ingredient_lots qty positive
ALTER TABLE public.ingredient_lots
  ADD CONSTRAINT chk_lot_qty_remaining_positive CHECK (qty_remaining >= 0),
  ADD CONSTRAINT chk_lot_qty_received_positive CHECK (qty_received > 0);

-- staff_shifts no overlap stesso staff
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE public.staff_shifts
  ADD CONSTRAINT uk_staff_shifts_no_overlap
  EXCLUDE USING GIST (
    staff_id WITH =,
    tstzrange(start_at, end_at) WITH &&
  );

-- guest_index bound positive
ALTER TABLE public.order_items
  ADD CONSTRAINT chk_guest_index_positive CHECK (guest_index IS NULL OR guest_index > 0);

-- ============================================================================
-- 11. MEDIUM: Race condition stock depletion idempotency
-- ============================================================================

-- Drop and recreate trigger con idempotency check
DROP TRIGGER IF EXISTS trg_deplete_stock_on_served ON public.order_items;

CREATE OR REPLACE FUNCTION deplete_stock_on_order_close()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  rec RECORD;
BEGIN
  IF NEW.status = 'served' AND (OLD.status IS DISTINCT FROM 'served') THEN
    FOR rec IN
      SELECT ri.ingredient_id, ri.qty * NEW.qty AS qty_consumed
      FROM public.recipes r
      JOIN public.recipe_items ri ON ri.recipe_id = r.id
      WHERE r.menu_item_id = NEW.menu_item_id
        AND ri.ingredient_id IS NOT NULL
        AND r.active = TRUE
    LOOP
      -- Idempotent: skip se già esiste stock_movement per questo order_item+ingredient
      IF NOT EXISTS (
        SELECT 1 FROM public.stock_movements sm
        WHERE sm.reference_type = 'order_item'
          AND sm.reference_id = NEW.id
          AND sm.ingredient_id = rec.ingredient_id
      ) THEN
        UPDATE public.ingredients
        SET stock_qty = stock_qty - rec.qty_consumed,
            updated_at = NOW()
        WHERE id = rec.ingredient_id;

        INSERT INTO public.stock_movements(ingredient_id, movement_type, qty, reference_type, reference_id)
        VALUES (rec.ingredient_id, 'OUT', rec.qty_consumed, 'order_item', NEW.id);
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_deplete_stock_on_served
  AFTER UPDATE OF status ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION deplete_stock_on_order_close();

-- ============================================================================
-- 12. MEDIUM: meal_plan_credits atomic increment helper
-- ============================================================================

CREATE OR REPLACE FUNCTION consume_meal_plan_cover(
  p_reservation_id UUID,
  p_meal_type TEXT,
  p_service_date DATE,
  p_covers INT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_consumed INT;
BEGIN
  UPDATE public.meal_plan_credits
  SET covers_used = covers_used + p_covers,
      updated_at = NOW()
  WHERE reservation_id = p_reservation_id
    AND meal_type = p_meal_type
    AND service_date = p_service_date
    AND covers_used + p_covers <= covers_allotted
  RETURNING covers_used INTO v_consumed;

  RETURN v_consumed IS NOT NULL;
END;
$$;

-- ============================================================================
-- 13. MEDIUM: get_user_restaurant_ids defensive auth check
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_restaurant_ids()
RETURNS UUID[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN ARRAY[]::UUID[];
  END IF;

  RETURN COALESCE(
    (SELECT array_agg(id)
     FROM public.restaurants
     WHERE tenant_id = ANY(get_user_tenant_ids())),
    ARRAY[]::UUID[]
  );
END;
$$;
