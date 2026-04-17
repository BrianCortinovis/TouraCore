-- 00069: Restaurant orders + order_items (POS)
-- Dipende da: restaurants (00064), restaurant_tables (00065), menu_items (00068)
-- Modulo: Restaurant M023

CREATE TABLE public.restaurant_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  reservation_id UUID REFERENCES public.restaurant_reservations(id) ON DELETE SET NULL,
  table_id UUID REFERENCES public.restaurant_tables(id) ON DELETE SET NULL,
  service_label TEXT,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','sent','closed','voided')),
  party_size SMALLINT NOT NULL DEFAULT 1,
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  service_charge NUMERIC(10,2) NOT NULL DEFAULT 0,
  cover_charge NUMERIC(10,2) NOT NULL DEFAULT 0,
  tip_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  vat_total NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_method TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending','paid','partial','refunded','void')),
  charge_to_room_reservation_id UUID,
  opened_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  voided_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_restaurant_orders_restaurant_status
  ON public.restaurant_orders(restaurant_id, status);
CREATE INDEX idx_restaurant_orders_table
  ON public.restaurant_orders(table_id) WHERE status IN ('open','sent');

ALTER TABLE public.restaurant_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "restaurant_orders_select" ON public.restaurant_orders
  FOR SELECT USING (restaurant_id = ANY(get_user_restaurant_ids()) OR is_platform_admin());
CREATE POLICY "restaurant_orders_insert" ON public.restaurant_orders
  FOR INSERT WITH CHECK (restaurant_id = ANY(get_user_restaurant_ids()) OR is_platform_admin());
CREATE POLICY "restaurant_orders_update" ON public.restaurant_orders
  FOR UPDATE USING (restaurant_id = ANY(get_user_restaurant_ids()) OR is_platform_admin());
CREATE POLICY "restaurant_orders_delete" ON public.restaurant_orders
  FOR DELETE USING (restaurant_id = ANY(get_user_restaurant_ids()) OR is_platform_admin());

CREATE TRIGGER set_restaurant_orders_updated_at
  BEFORE UPDATE ON public.restaurant_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- order_items
-- ============================================================================

CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.restaurant_orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE SET NULL,
  item_name TEXT NOT NULL,
  qty SMALLINT NOT NULL DEFAULT 1 CHECK (qty > 0),
  unit_price NUMERIC(10,2) NOT NULL,
  modifiers JSONB NOT NULL DEFAULT '[]'::jsonb,
  modifier_delta NUMERIC(10,2) NOT NULL DEFAULT 0,
  vat_pct NUMERIC(4,2) NOT NULL DEFAULT 10,
  course_number SMALLINT NOT NULL DEFAULT 1,
  station_code TEXT,
  guest_index SMALLINT,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','sent','preparing','ready','served','voided')),
  notes TEXT,
  fired_at TIMESTAMPTZ,
  ready_at TIMESTAMPTZ,
  served_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_items_order ON public.order_items(order_id);
CREATE INDEX idx_order_items_status ON public.order_items(status) WHERE status IN ('sent','preparing');

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "order_items_all" ON public.order_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.restaurant_orders o
            WHERE o.id = order_items.order_id
              AND (o.restaurant_id = ANY(get_user_restaurant_ids()) OR is_platform_admin()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.restaurant_orders o
            WHERE o.id = order_items.order_id
              AND (o.restaurant_id = ANY(get_user_restaurant_ids()) OR is_platform_admin()))
  );

CREATE TRIGGER set_order_items_updated_at
  BEFORE UPDATE ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- Trigger ricalcolo totali order su order_items change
-- ============================================================================

CREATE OR REPLACE FUNCTION recalc_restaurant_order_totals(p_order_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_subtotal NUMERIC(10,2);
  v_vat NUMERIC(10,2);
BEGIN
  SELECT
    COALESCE(SUM((unit_price + modifier_delta) * qty), 0),
    COALESCE(SUM(((unit_price + modifier_delta) * qty) * (vat_pct / 100.0)), 0)
  INTO v_subtotal, v_vat
  FROM public.order_items
  WHERE order_id = p_order_id AND status <> 'voided';

  UPDATE public.restaurant_orders
  SET
    subtotal = v_subtotal,
    vat_total = v_vat,
    total = v_subtotal + service_charge + cover_charge + tip_amount,
    updated_at = NOW()
  WHERE id = p_order_id;
END;
$$;

CREATE OR REPLACE FUNCTION trg_recalc_order_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM recalc_restaurant_order_totals(OLD.order_id);
    RETURN OLD;
  ELSE
    PERFORM recalc_restaurant_order_totals(NEW.order_id);
    RETURN NEW;
  END IF;
END;
$$;

CREATE TRIGGER trg_order_items_recalc
  AFTER INSERT OR UPDATE OR DELETE ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION trg_recalc_order_totals();
