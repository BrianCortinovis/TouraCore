-- 00022: Policy di lettura pubblica per booking engine e portali
-- Consente agli utenti anonimi di leggere room_types, rooms, rate_plans,
-- seasons e rate_prices delle proprietà attive (is_active = true).
-- Solo SELECT — nessuna scrittura pubblica.
-- Dipende da: properties (00007), room_types/rooms (00007), rates (00008)

-- Room types: lettura pubblica per proprietà attive
CREATE POLICY "room_types_public_read" ON room_types
  FOR SELECT USING (
    is_active = true
    AND property_id IN (SELECT id FROM properties WHERE is_active = true)
  );

-- Rooms: lettura pubblica per proprietà attive
CREATE POLICY "rooms_public_read" ON rooms
  FOR SELECT USING (
    is_active = true
    AND property_id IN (SELECT id FROM properties WHERE is_active = true)
  );

-- Rate plans: lettura pubblica per proprietà attive e piani pubblici
CREATE POLICY "rate_plans_public_read" ON rate_plans
  FOR SELECT USING (
    is_active = true
    AND is_public = true
    AND property_id IN (SELECT id FROM properties WHERE is_active = true)
  );

-- Seasons: lettura pubblica per proprietà attive
CREATE POLICY "seasons_public_read" ON seasons
  FOR SELECT USING (
    property_id IN (SELECT id FROM properties WHERE is_active = true)
  );

-- Rate prices: lettura pubblica via rate_plan pubblico di proprietà attiva
CREATE POLICY "rate_prices_public_read" ON rate_prices
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM rate_plans rp
      WHERE rp.id = rate_plan_id
        AND rp.is_active = true
        AND rp.is_public = true
        AND rp.property_id IN (SELECT id FROM properties WHERE is_active = true)
    )
  );
