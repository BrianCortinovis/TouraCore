-- ============================================================================
-- 00039: Upselling — catalogo servizi extra
-- (upsell_orders verrà creata quando esisterà la tabella reservations)
-- ============================================================================

-- Catalogo offerte upselling per struttura
CREATE TABLE upsell_offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    photo_url TEXT,
    price DECIMAL(12,2) NOT NULL DEFAULT 0,
    category TEXT NOT NULL CHECK (category IN (
        'food_beverage', 'transfer', 'experience', 'spa_wellness',
        'early_checkin', 'late_checkout', 'parking', 'linen',
        'laundry', 'kitchen', 'bike', 'baby_kit', 'pet_kit',
        'room_upgrade', 'other'
    )),
    charge_mode TEXT NOT NULL DEFAULT 'paid' CHECK (charge_mode IN ('free', 'paid')),
    pricing_mode TEXT NOT NULL DEFAULT 'per_stay' CHECK (pricing_mode IN (
        'per_stay', 'per_night', 'per_guest', 'per_item', 'per_hour', 'per_day'
    )),
    included_quantity INTEGER NOT NULL DEFAULT 0,
    max_quantity INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    available_days TEXT[] DEFAULT '{}',
    max_per_day INTEGER,
    requires_request BOOLEAN DEFAULT FALSE,
    online_bookable BOOLEAN DEFAULT TRUE,
    advance_notice_hours INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_upsell_offers_entity ON upsell_offers(entity_id);
CREATE INDEX idx_upsell_offers_active ON upsell_offers(entity_id, is_active);

-- RLS
ALTER TABLE upsell_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY upsell_offers_select ON upsell_offers FOR SELECT
    USING (entity_id = ANY(get_user_entity_ids()));
CREATE POLICY upsell_offers_insert ON upsell_offers FOR INSERT
    WITH CHECK (entity_id = ANY(get_user_entity_ids()));
CREATE POLICY upsell_offers_update ON upsell_offers FOR UPDATE
    USING (entity_id = ANY(get_user_entity_ids()));
CREATE POLICY upsell_offers_delete ON upsell_offers FOR DELETE
    USING (entity_id = ANY(get_user_entity_ids()));

-- Trigger updated_at
CREATE TRIGGER update_upsell_offers_timestamp
    BEFORE UPDATE ON upsell_offers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
