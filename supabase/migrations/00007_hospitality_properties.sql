-- 00007: Estensioni hospitality — proprietà, tipologie camere, camere, blocchi
-- Dipende da: tenants (00002), memberships (00004), get_user_tenant_ids() (00001)
-- Tabelle verticali separate dal core: zero colonne hospitality in tenants

-- ============================================================================
-- PROPERTIES — estensione verticale di tenant per hospitality
-- ============================================================================

CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'hotel'
    CHECK (type IN ('hotel', 'residence', 'mixed', 'b_and_b', 'agriturismo', 'apartment', 'affittacamere')),
  legal_name TEXT,
  vat_number TEXT,
  fiscal_code TEXT,
  rea_number TEXT,
  address TEXT,
  city TEXT,
  province TEXT,
  zip TEXT,
  country TEXT DEFAULT 'IT',
  email TEXT,
  phone TEXT,
  pec TEXT,
  website TEXT,
  logo_url TEXT,
  default_check_in_time TIME DEFAULT '14:00',
  default_check_out_time TIME DEFAULT '10:00',
  default_currency TEXT DEFAULT 'EUR',
  default_language TEXT DEFAULT 'it',
  default_vat_rate DECIMAL(5,2) DEFAULT 10.00,
  timezone TEXT DEFAULT 'Europe/Rome',
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

-- Funzione helper: property_id accessibili dall'utente corrente
CREATE OR REPLACE FUNCTION get_user_property_ids()
RETURNS UUID[]
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(array_agg(p.id), ARRAY[]::UUID[])
  FROM properties p
  WHERE p.tenant_id = ANY(get_user_tenant_ids());
$$;

CREATE POLICY "properties_select" ON properties
  FOR SELECT USING (id = ANY(get_user_property_ids()));
CREATE POLICY "properties_insert" ON properties
  FOR INSERT WITH CHECK (tenant_id = ANY(get_user_tenant_ids()));
CREATE POLICY "properties_update" ON properties
  FOR UPDATE USING (id = ANY(get_user_property_ids()));
CREATE POLICY "properties_delete" ON properties
  FOR DELETE USING (id = ANY(get_user_property_ids()));

CREATE INDEX idx_properties_tenant ON properties(tenant_id);

CREATE TRIGGER set_properties_updated_at
  BEFORE UPDATE ON properties
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- ROOM TYPES — tipologie camera per proprietà
-- ============================================================================

CREATE TABLE room_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  category TEXT NOT NULL DEFAULT 'room'
    CHECK (category IN ('room', 'apartment', 'suite', 'villa', 'bungalow', 'chalet', 'tent', 'pitch')),
  description TEXT,
  base_occupancy INTEGER NOT NULL DEFAULT 2,
  max_occupancy INTEGER NOT NULL DEFAULT 2,
  max_children INTEGER DEFAULT 0,
  base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  size_sqm DECIMAL(6,1),
  amenities JSONB DEFAULT '[]',
  photos TEXT[] DEFAULT '{}',
  bed_configuration TEXT,
  floor_range TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE room_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "room_types_select" ON room_types
  FOR SELECT USING (property_id = ANY(get_user_property_ids()));
CREATE POLICY "room_types_insert" ON room_types
  FOR INSERT WITH CHECK (property_id = ANY(get_user_property_ids()));
CREATE POLICY "room_types_update" ON room_types
  FOR UPDATE USING (property_id = ANY(get_user_property_ids()));
CREATE POLICY "room_types_delete" ON room_types
  FOR DELETE USING (property_id = ANY(get_user_property_ids()));

CREATE INDEX idx_room_types_property ON room_types(property_id);

CREATE TRIGGER set_room_types_updated_at
  BEFORE UPDATE ON room_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- ROOMS — camere fisiche
-- ============================================================================

CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  room_type_id UUID NOT NULL REFERENCES room_types(id) ON DELETE RESTRICT,
  room_number TEXT NOT NULL,
  name TEXT,
  floor INTEGER,
  building TEXT,
  status TEXT NOT NULL DEFAULT 'available'
    CHECK (status IN ('available', 'occupied', 'maintenance', 'out_of_order', 'blocked')),
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  features JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(property_id, room_number)
);

ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rooms_select" ON rooms
  FOR SELECT USING (property_id = ANY(get_user_property_ids()));
CREATE POLICY "rooms_insert" ON rooms
  FOR INSERT WITH CHECK (property_id = ANY(get_user_property_ids()));
CREATE POLICY "rooms_update" ON rooms
  FOR UPDATE USING (property_id = ANY(get_user_property_ids()));
CREATE POLICY "rooms_delete" ON rooms
  FOR DELETE USING (property_id = ANY(get_user_property_ids()));

CREATE INDEX idx_rooms_property ON rooms(property_id);
CREATE INDEX idx_rooms_type ON rooms(room_type_id);

CREATE TRIGGER set_rooms_updated_at
  BEFORE UPDATE ON rooms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- ROOM BLOCKS — blocchi camera (manutenzione, uso privato, ecc.)
-- ============================================================================

CREATE TABLE room_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  block_type TEXT NOT NULL DEFAULT 'owner_use'
    CHECK (block_type IN ('owner_use', 'friends', 'maintenance', 'renovation', 'seasonal_close', 'other')),
  date_from DATE NOT NULL,
  date_to DATE NOT NULL,
  reason TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (date_to >= date_from)
);

ALTER TABLE room_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "room_blocks_select" ON room_blocks
  FOR SELECT USING (property_id = ANY(get_user_property_ids()));
CREATE POLICY "room_blocks_insert" ON room_blocks
  FOR INSERT WITH CHECK (property_id = ANY(get_user_property_ids()));
CREATE POLICY "room_blocks_update" ON room_blocks
  FOR UPDATE USING (property_id = ANY(get_user_property_ids()));
CREATE POLICY "room_blocks_delete" ON room_blocks
  FOR DELETE USING (property_id = ANY(get_user_property_ids()));

CREATE INDEX idx_room_blocks_dates ON room_blocks(property_id, date_from, date_to);
CREATE INDEX idx_room_blocks_room ON room_blocks(room_id);

CREATE TRIGGER set_room_blocks_updated_at
  BEFORE UPDATE ON room_blocks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
