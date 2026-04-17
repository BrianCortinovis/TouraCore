-- 00065: Restaurant floor plan — rooms (sale) + tables
-- Dipende da: restaurants (00064)
-- Modulo: Restaurant M021/S01

CREATE TABLE public.restaurant_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  zone_type TEXT CHECK (zone_type IN ('indoor','outdoor','private','bar','lounge')),
  order_idx INT NOT NULL DEFAULT 0,
  layout JSONB NOT NULL DEFAULT '{"width":1200,"height":800}'::jsonb,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_restaurant_rooms_restaurant ON public.restaurant_rooms(restaurant_id) WHERE active = TRUE;

ALTER TABLE public.restaurant_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "restaurant_rooms_select" ON public.restaurant_rooms
  FOR SELECT USING (
    restaurant_id = ANY(get_user_restaurant_ids())
    OR is_platform_admin()
  );

CREATE POLICY "restaurant_rooms_insert" ON public.restaurant_rooms
  FOR INSERT WITH CHECK (
    restaurant_id = ANY(get_user_restaurant_ids())
    OR is_platform_admin()
  );

CREATE POLICY "restaurant_rooms_update" ON public.restaurant_rooms
  FOR UPDATE USING (
    restaurant_id = ANY(get_user_restaurant_ids())
    OR is_platform_admin()
  );

CREATE POLICY "restaurant_rooms_delete" ON public.restaurant_rooms
  FOR DELETE USING (
    restaurant_id = ANY(get_user_restaurant_ids())
    OR is_platform_admin()
  );

CREATE TRIGGER set_restaurant_rooms_updated_at
  BEFORE UPDATE ON public.restaurant_rooms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- restaurant_tables
-- ============================================================================

CREATE TABLE public.restaurant_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES public.restaurant_rooms(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  shape TEXT NOT NULL DEFAULT 'square'
    CHECK (shape IN ('round','square','rect','custom')),
  seats_min SMALLINT NOT NULL DEFAULT 1 CHECK (seats_min > 0),
  seats_max SMALLINT NOT NULL DEFAULT 4 CHECK (seats_max >= seats_min),
  seats_default SMALLINT NOT NULL DEFAULT 4
    CHECK (seats_default BETWEEN seats_min AND seats_max),
  joinable_with UUID[] NOT NULL DEFAULT '{}',
  attributes TEXT[] NOT NULL DEFAULT '{}',
  position JSONB NOT NULL DEFAULT '{"x":0,"y":0,"w":80,"h":80,"rotation":0}'::jsonb,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (restaurant_id, code)
);

CREATE INDEX idx_restaurant_tables_restaurant ON public.restaurant_tables(restaurant_id) WHERE active = TRUE;
CREATE INDEX idx_restaurant_tables_room ON public.restaurant_tables(room_id) WHERE active = TRUE;

ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "restaurant_tables_select" ON public.restaurant_tables
  FOR SELECT USING (
    restaurant_id = ANY(get_user_restaurant_ids())
    OR is_platform_admin()
  );

CREATE POLICY "restaurant_tables_insert" ON public.restaurant_tables
  FOR INSERT WITH CHECK (
    restaurant_id = ANY(get_user_restaurant_ids())
    OR is_platform_admin()
  );

CREATE POLICY "restaurant_tables_update" ON public.restaurant_tables
  FOR UPDATE USING (
    restaurant_id = ANY(get_user_restaurant_ids())
    OR is_platform_admin()
  );

CREATE POLICY "restaurant_tables_delete" ON public.restaurant_tables
  FOR DELETE USING (
    restaurant_id = ANY(get_user_restaurant_ids())
    OR is_platform_admin()
  );

CREATE TRIGGER set_restaurant_tables_updated_at
  BEFORE UPDATE ON public.restaurant_tables
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
