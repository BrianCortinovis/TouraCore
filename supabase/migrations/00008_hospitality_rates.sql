-- 00008: Tariffe hospitality — piani tariffari, stagioni, prezzi
-- Dipende da: properties (00007), room_types (00007), get_user_property_ids() (00007)

-- ============================================================================
-- RATE PLANS — piani tariffari per proprietà
-- ============================================================================

CREATE TABLE rate_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  rate_type TEXT NOT NULL DEFAULT 'standard'
    CHECK (rate_type IN ('standard', 'non_refundable', 'last_minute', 'early_bird', 'group', 'corporate', 'ota')),
  meal_plan TEXT NOT NULL DEFAULT 'room_only'
    CHECK (meal_plan IN ('room_only', 'breakfast', 'half_board', 'full_board', 'all_inclusive')),
  description TEXT,
  cancellation_policy JSONB DEFAULT '{}',
  is_derived BOOLEAN DEFAULT false,
  parent_rate_plan_id UUID REFERENCES rate_plans(id),
  derivation_rule JSONB,
  is_public BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE rate_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rate_plans_select" ON rate_plans
  FOR SELECT USING (property_id = ANY(get_user_property_ids()));
CREATE POLICY "rate_plans_insert" ON rate_plans
  FOR INSERT WITH CHECK (property_id = ANY(get_user_property_ids()));
CREATE POLICY "rate_plans_update" ON rate_plans
  FOR UPDATE USING (property_id = ANY(get_user_property_ids()));
CREATE POLICY "rate_plans_delete" ON rate_plans
  FOR DELETE USING (property_id = ANY(get_user_property_ids()));

CREATE INDEX idx_rate_plans_property ON rate_plans(property_id);

CREATE TRIGGER set_rate_plans_updated_at
  BEFORE UPDATE ON rate_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- SEASONS — stagionalità per proprietà
-- ============================================================================

CREATE TABLE seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3b82f6',
  date_from DATE NOT NULL,
  date_to DATE NOT NULL,
  price_modifier DECIMAL(5,3) DEFAULT 1.000,
  min_stay INTEGER DEFAULT 1,
  max_stay INTEGER,
  allowed_arrival_days SMALLINT[] NOT NULL DEFAULT '{}',
  allowed_departure_days SMALLINT[] NOT NULL DEFAULT '{}',
  stay_discounts JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT seasons_max_stay_check CHECK (max_stay IS NULL OR max_stay >= 1),
  CONSTRAINT seasons_allowed_arrival_days_valid CHECK (
    allowed_arrival_days <@ ARRAY[0,1,2,3,4,5,6]::SMALLINT[]
  ),
  CONSTRAINT seasons_allowed_departure_days_valid CHECK (
    allowed_departure_days <@ ARRAY[0,1,2,3,4,5,6]::SMALLINT[]
  )
);

ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "seasons_select" ON seasons
  FOR SELECT USING (property_id = ANY(get_user_property_ids()));
CREATE POLICY "seasons_insert" ON seasons
  FOR INSERT WITH CHECK (property_id = ANY(get_user_property_ids()));
CREATE POLICY "seasons_update" ON seasons
  FOR UPDATE USING (property_id = ANY(get_user_property_ids()));
CREATE POLICY "seasons_delete" ON seasons
  FOR DELETE USING (property_id = ANY(get_user_property_ids()));

CREATE INDEX idx_seasons_property ON seasons(property_id);
CREATE INDEX idx_seasons_dates ON seasons(date_from, date_to);

-- ============================================================================
-- RATE PRICES — prezzi per piano tariffario / tipologia camera / periodo
-- ============================================================================

CREATE TABLE rate_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_plan_id UUID NOT NULL REFERENCES rate_plans(id) ON DELETE CASCADE,
  room_type_id UUID NOT NULL REFERENCES room_types(id) ON DELETE CASCADE,
  date_from DATE NOT NULL,
  date_to DATE NOT NULL,
  price_per_night DECIMAL(10,2) NOT NULL,
  price_single_use DECIMAL(10,2),
  extra_adult DECIMAL(10,2) DEFAULT 0,
  extra_child DECIMAL(10,2) DEFAULT 0,
  min_stay INTEGER DEFAULT 1,
  max_stay INTEGER,
  closed_to_arrival BOOLEAN DEFAULT false,
  closed_to_departure BOOLEAN DEFAULT false,
  stop_sell BOOLEAN DEFAULT false,
  allowed_arrival_days SMALLINT[],
  allowed_departure_days SMALLINT[],
  stay_discounts JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT rate_prices_max_stay_check CHECK (max_stay IS NULL OR max_stay >= 1),
  CONSTRAINT rate_prices_allowed_arrival_days_valid CHECK (
    allowed_arrival_days IS NULL OR allowed_arrival_days <@ ARRAY[0,1,2,3,4,5,6]::SMALLINT[]
  ),
  CONSTRAINT rate_prices_allowed_departure_days_valid CHECK (
    allowed_departure_days IS NULL OR allowed_departure_days <@ ARRAY[0,1,2,3,4,5,6]::SMALLINT[]
  )
);

ALTER TABLE rate_prices ENABLE ROW LEVEL SECURITY;

-- RLS inline: rate_prices non ha property_id diretto, usa join via rate_plan
CREATE POLICY "rate_prices_select" ON rate_prices
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM rate_plans rp WHERE rp.id = rate_plan_id AND rp.property_id = ANY(get_user_property_ids()))
  );
CREATE POLICY "rate_prices_insert" ON rate_prices
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM rate_plans rp WHERE rp.id = rate_plan_id AND rp.property_id = ANY(get_user_property_ids()))
  );
CREATE POLICY "rate_prices_update" ON rate_prices
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM rate_plans rp WHERE rp.id = rate_plan_id AND rp.property_id = ANY(get_user_property_ids()))
  );
CREATE POLICY "rate_prices_delete" ON rate_prices
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM rate_plans rp WHERE rp.id = rate_plan_id AND rp.property_id = ANY(get_user_property_ids()))
  );

CREATE INDEX idx_rate_prices_dates ON rate_prices(date_from, date_to);
CREATE INDEX idx_rate_prices_room_type ON rate_prices(room_type_id);
CREATE INDEX idx_rate_prices_plan ON rate_prices(rate_plan_id);

CREATE TRIGGER set_rate_prices_updated_at
  BEFORE UPDATE ON rate_prices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
