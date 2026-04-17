-- 00068: Restaurant menu — categories + items + modifiers + allergens UE
-- Dipende da: restaurants (00064)
-- Modulo: Restaurant M023

CREATE TABLE public.menu_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_i18n JSONB NOT NULL DEFAULT '{}'::jsonb,
  order_idx INT NOT NULL DEFAULT 0,
  available_services TEXT[] NOT NULL DEFAULT '{}',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_menu_categories_restaurant ON public.menu_categories(restaurant_id) WHERE active = TRUE;

ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "menu_categories_select" ON public.menu_categories
  FOR SELECT USING (restaurant_id = ANY(get_user_restaurant_ids()) OR is_platform_admin());
CREATE POLICY "menu_categories_insert" ON public.menu_categories
  FOR INSERT WITH CHECK (restaurant_id = ANY(get_user_restaurant_ids()) OR is_platform_admin());
CREATE POLICY "menu_categories_update" ON public.menu_categories
  FOR UPDATE USING (restaurant_id = ANY(get_user_restaurant_ids()) OR is_platform_admin());
CREATE POLICY "menu_categories_delete" ON public.menu_categories
  FOR DELETE USING (restaurant_id = ANY(get_user_restaurant_ids()) OR is_platform_admin());

CREATE TRIGGER set_menu_categories_updated_at
  BEFORE UPDATE ON public.menu_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- menu_items
-- ============================================================================

CREATE TABLE public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.menu_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_i18n JSONB NOT NULL DEFAULT '{}'::jsonb,
  description TEXT,
  description_i18n JSONB NOT NULL DEFAULT '{}'::jsonb,
  price_base NUMERIC(10,2) NOT NULL CHECK (price_base >= 0),
  price_rules JSONB NOT NULL DEFAULT '[]'::jsonb,
  vat_pct NUMERIC(4,2) NOT NULL DEFAULT 10,
  course_number SMALLINT NOT NULL DEFAULT 1 CHECK (course_number BETWEEN 1 AND 5),
  station_code TEXT,
  recipe_id UUID,
  photo_url TEXT,
  allergens TEXT[] NOT NULL DEFAULT '{}',
  available_services TEXT[] NOT NULL DEFAULT '{}',
  order_idx INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_allergens CHECK (
    allergens <@ ARRAY[
      'gluten','crustaceans','eggs','fish','peanuts','soybeans','milk','nuts',
      'celery','mustard','sesame','sulphites','lupin','molluscs'
    ]::TEXT[]
  )
);

CREATE INDEX idx_menu_items_restaurant ON public.menu_items(restaurant_id) WHERE active = TRUE;
CREATE INDEX idx_menu_items_category ON public.menu_items(category_id) WHERE active = TRUE;

ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "menu_items_select" ON public.menu_items
  FOR SELECT USING (restaurant_id = ANY(get_user_restaurant_ids()) OR is_platform_admin());
CREATE POLICY "menu_items_insert" ON public.menu_items
  FOR INSERT WITH CHECK (restaurant_id = ANY(get_user_restaurant_ids()) OR is_platform_admin());
CREATE POLICY "menu_items_update" ON public.menu_items
  FOR UPDATE USING (restaurant_id = ANY(get_user_restaurant_ids()) OR is_platform_admin());
CREATE POLICY "menu_items_delete" ON public.menu_items
  FOR DELETE USING (restaurant_id = ANY(get_user_restaurant_ids()) OR is_platform_admin());

CREATE TRIGGER set_menu_items_updated_at
  BEFORE UPDATE ON public.menu_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- menu_modifiers (gruppi di modifiche: extra, no, sostituzioni)
-- ============================================================================

CREATE TABLE public.menu_modifier_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  selection_type TEXT NOT NULL DEFAULT 'multi'
    CHECK (selection_type IN ('single','multi','required')),
  min_select SMALLINT NOT NULL DEFAULT 0,
  max_select SMALLINT NOT NULL DEFAULT 10,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.menu_modifiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.menu_modifier_groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price_delta NUMERIC(10,2) NOT NULL DEFAULT 0,
  order_idx INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.menu_item_modifier_groups (
  item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.menu_modifier_groups(id) ON DELETE CASCADE,
  PRIMARY KEY (item_id, group_id)
);

ALTER TABLE public.menu_modifier_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_item_modifier_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "modifier_groups_all" ON public.menu_modifier_groups
  FOR ALL USING (restaurant_id = ANY(get_user_restaurant_ids()) OR is_platform_admin())
  WITH CHECK (restaurant_id = ANY(get_user_restaurant_ids()) OR is_platform_admin());

CREATE POLICY "modifiers_all" ON public.menu_modifiers
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.menu_modifier_groups g
            WHERE g.id = menu_modifiers.group_id
              AND (g.restaurant_id = ANY(get_user_restaurant_ids()) OR is_platform_admin()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.menu_modifier_groups g
            WHERE g.id = menu_modifiers.group_id
              AND (g.restaurant_id = ANY(get_user_restaurant_ids()) OR is_platform_admin()))
  );

CREATE POLICY "item_modifier_groups_all" ON public.menu_item_modifier_groups
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.menu_items i
            WHERE i.id = menu_item_modifier_groups.item_id
              AND (i.restaurant_id = ANY(get_user_restaurant_ids()) OR is_platform_admin()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.menu_items i
            WHERE i.id = menu_item_modifier_groups.item_id
              AND (i.restaurant_id = ANY(get_user_restaurant_ids()) OR is_platform_admin()))
  );

CREATE TRIGGER set_modifier_groups_updated_at
  BEFORE UPDATE ON public.menu_modifier_groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
