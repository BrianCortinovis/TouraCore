-- 00072: Inventory + recipes + suppliers + stock movements + HACCP
-- Modulo: Restaurant M026

CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact TEXT,
  phone TEXT,
  email TEXT,
  vat_number TEXT,
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  unit_of_measure TEXT NOT NULL CHECK (unit_of_measure IN ('kg','g','l','ml','pcs','bottle','box')),
  avg_cost NUMERIC(10,4) NOT NULL DEFAULT 0,
  stock_qty NUMERIC(10,3) NOT NULL DEFAULT 0,
  low_stock_threshold NUMERIC(10,3),
  primary_supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  allergens TEXT[] NOT NULL DEFAULT '{}',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ingredients_restaurant ON public.ingredients(restaurant_id) WHERE active = TRUE;

CREATE TABLE public.recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  yield_qty NUMERIC(10,3) NOT NULL DEFAULT 1,
  yield_unit TEXT,
  total_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  version SMALLINT NOT NULL DEFAULT 1,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.recipe_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  ingredient_id UUID REFERENCES public.ingredients(id) ON DELETE CASCADE,
  sub_recipe_id UUID REFERENCES public.recipes(id) ON DELETE SET NULL,
  qty NUMERIC(10,3) NOT NULL,
  unit TEXT NOT NULL,
  notes TEXT,
  CHECK (
    (ingredient_id IS NOT NULL AND sub_recipe_id IS NULL)
    OR (ingredient_id IS NULL AND sub_recipe_id IS NOT NULL)
  )
);

CREATE INDEX idx_recipe_items_recipe ON public.recipe_items(recipe_id);

CREATE TABLE public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_id UUID NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('IN','OUT','ADJUST','WASTE','TRANSFER')),
  qty NUMERIC(10,3) NOT NULL,
  unit_cost NUMERIC(10,4) NOT NULL DEFAULT 0,
  reference_type TEXT,
  reference_id UUID,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_stock_movements_ingredient ON public.stock_movements(ingredient_id, created_at DESC);

CREATE TABLE public.haccp_temperature_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  equipment_code TEXT NOT NULL,
  equipment_name TEXT NOT NULL,
  temperature_c NUMERIC(4,1) NOT NULL,
  reading_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recorded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_haccp_temp_restaurant_at ON public.haccp_temperature_log(restaurant_id, reading_at DESC);

CREATE TABLE public.ingredient_lots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_id UUID NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  lot_code TEXT NOT NULL,
  received_date DATE NOT NULL,
  expiry_date DATE,
  qty_received NUMERIC(10,3) NOT NULL,
  qty_remaining NUMERIC(10,3) NOT NULL,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ingredient_lots_expiry ON public.ingredient_lots(expiry_date) WHERE qty_remaining > 0;

-- ============================================================================
-- RLS via restaurant
-- ============================================================================

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.haccp_temperature_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredient_lots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "suppliers_all" ON public.suppliers
  FOR ALL USING (restaurant_id = ANY(get_user_restaurant_ids()) OR is_platform_admin())
  WITH CHECK (restaurant_id = ANY(get_user_restaurant_ids()) OR is_platform_admin());

CREATE POLICY "ingredients_all" ON public.ingredients
  FOR ALL USING (restaurant_id = ANY(get_user_restaurant_ids()) OR is_platform_admin())
  WITH CHECK (restaurant_id = ANY(get_user_restaurant_ids()) OR is_platform_admin());

CREATE POLICY "recipes_all" ON public.recipes
  FOR ALL USING (restaurant_id = ANY(get_user_restaurant_ids()) OR is_platform_admin())
  WITH CHECK (restaurant_id = ANY(get_user_restaurant_ids()) OR is_platform_admin());

CREATE POLICY "recipe_items_all" ON public.recipe_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = recipe_items.recipe_id
            AND (r.restaurant_id = ANY(get_user_restaurant_ids()) OR is_platform_admin()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = recipe_items.recipe_id
            AND (r.restaurant_id = ANY(get_user_restaurant_ids()) OR is_platform_admin()))
  );

CREATE POLICY "stock_movements_all" ON public.stock_movements
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.ingredients i WHERE i.id = stock_movements.ingredient_id
            AND (i.restaurant_id = ANY(get_user_restaurant_ids()) OR is_platform_admin()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.ingredients i WHERE i.id = stock_movements.ingredient_id
            AND (i.restaurant_id = ANY(get_user_restaurant_ids()) OR is_platform_admin()))
  );

CREATE POLICY "haccp_temperature_log_all" ON public.haccp_temperature_log
  FOR ALL USING (restaurant_id = ANY(get_user_restaurant_ids()) OR is_platform_admin())
  WITH CHECK (restaurant_id = ANY(get_user_restaurant_ids()) OR is_platform_admin());

CREATE POLICY "ingredient_lots_all" ON public.ingredient_lots
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.ingredients i WHERE i.id = ingredient_lots.ingredient_id
            AND (i.restaurant_id = ANY(get_user_restaurant_ids()) OR is_platform_admin()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.ingredients i WHERE i.id = ingredient_lots.ingredient_id
            AND (i.restaurant_id = ANY(get_user_restaurant_ids()) OR is_platform_admin()))
  );

-- Triggers updated_at
CREATE TRIGGER set_suppliers_updated_at BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_ingredients_updated_at BEFORE UPDATE ON public.ingredients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_recipes_updated_at BEFORE UPDATE ON public.recipes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- Trigger stock depletion on order_items closed
-- ============================================================================

CREATE OR REPLACE FUNCTION deplete_stock_on_order_close()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  rec RECORD;
BEGIN
  -- Solo se passa a 'served' o 'closed' (dipende dal flusso)
  IF NEW.status = 'served' AND (OLD.status IS DISTINCT FROM 'served') THEN
    -- Per ogni ricetta del menu_item, deduci ingredienti
    FOR rec IN
      SELECT ri.ingredient_id, ri.qty * NEW.qty AS qty_consumed
      FROM public.recipes r
      JOIN public.recipe_items ri ON ri.recipe_id = r.id
      WHERE r.menu_item_id = NEW.menu_item_id
        AND ri.ingredient_id IS NOT NULL
        AND r.active = TRUE
    LOOP
      UPDATE public.ingredients
      SET stock_qty = stock_qty - rec.qty_consumed,
          updated_at = NOW()
      WHERE id = rec.ingredient_id;

      INSERT INTO public.stock_movements(ingredient_id, movement_type, qty, reference_type, reference_id)
      VALUES (rec.ingredient_id, 'OUT', rec.qty_consumed, 'order_item', NEW.id);
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_deplete_stock_on_served
  AFTER UPDATE OF status ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION deplete_stock_on_order_close();
