-- 00098: Seed pricing catalog + rules per demo Alpina Bikes
-- Dipende da: 00093-00097
-- Modulo: Bike Rental M040/S02 (seed demo)

DO $$
DECLARE
  v_tenant_id UUID;
  v_entity_id UUID := '11111111-1111-4111-a111-aaaa00000001';
BEGIN
  SELECT id INTO v_tenant_id FROM public.tenants WHERE slug = 'villa-irabo' LIMIT 1;
  IF v_tenant_id IS NULL THEN
    RAISE NOTICE 'Tenant villa-irabo not found, skipping pricing seed';
    RETURN;
  END IF;

  -- bike_types con tariffe
  INSERT INTO public.bike_types (id, bike_rental_id, tenant_id, type_key, display_name, description, hourly_rate, half_day_rate, daily_rate, weekly_rate, deposit_amount, age_min, height_min, height_max, active, display_order) VALUES
    ('77777777-7777-4777-a777-aaaa00000001', v_entity_id, v_tenant_id, 'mtb', 'Mountain Bike', 'MTB professionale per trail e sentieri', 8, 18, 30, 160, 150, 14, 150, 200, TRUE, 1),
    ('77777777-7777-4777-a777-aaaa00000002', v_entity_id, v_tenant_id, 'e_city', 'E-Bike City', 'Bici elettrica urbana con pedalata assistita', 10, 25, 40, 220, 300, 14, 150, 200, TRUE, 2),
    ('77777777-7777-4777-a777-aaaa00000003', v_entity_id, v_tenant_id, 'e_mtb', 'E-MTB', 'MTB elettrica per salite impegnative', 14, 35, 55, 300, 400, 16, 155, 200, TRUE, 3),
    ('77777777-7777-4777-a777-aaaa00000004', v_entity_id, v_tenant_id, 'road', 'Bici da strada', 'Bici da corsa telaio in carbonio', 12, 28, 45, 240, 250, 16, 160, 200, TRUE, 4),
    ('77777777-7777-4777-a777-aaaa00000005', v_entity_id, v_tenant_id, 'cargo', 'Cargo Bike', 'Cargo muscolare per trasporto bambini/merci', 10, 22, 35, 180, 200, 18, 160, 200, TRUE, 5),
    ('77777777-7777-4777-a777-aaaa00000006', v_entity_id, v_tenant_id, 'kids', 'Bici bambino', 'Bici 24" per bambini 6-12 anni', 5, 12, 18, 80, 50, 4, 100, 160, TRUE, 6),
    ('77777777-7777-4777-a777-aaaa00000007', v_entity_id, v_tenant_id, 'hybrid', 'Ibrida', 'Versatile city/trekking per tutti', 7, 16, 28, 150, 150, 12, 140, 200, TRUE, 7)
  ON CONFLICT (id) DO NOTHING;

  -- addons catalog
  INSERT INTO public.bike_rental_addons (id, bike_rental_id, tenant_id, addon_key, display_name, category, pricing_mode, unit_price, mandatory_for, active, display_order) VALUES
    ('88888888-8888-4888-a888-aaaa00000001', v_entity_id, v_tenant_id, 'helmet', 'Casco', 'safety', 'per_rental', 3.0, ARRAY['minor'], TRUE, 1),
    ('88888888-8888-4888-a888-aaaa00000002', v_entity_id, v_tenant_id, 'lock', 'Lucchetto antifurto', 'safety', 'per_rental', 2.0, ARRAY[]::TEXT[], TRUE, 2),
    ('88888888-8888-4888-a888-aaaa00000003', v_entity_id, v_tenant_id, 'child_seat', 'Seggiolino bambino', 'transport', 'per_day', 5.0, ARRAY[]::TEXT[], TRUE, 3),
    ('88888888-8888-4888-a888-aaaa00000004', v_entity_id, v_tenant_id, 'gps', 'GPS tracker', 'navigation', 'per_day', 4.0, ARRAY[]::TEXT[], TRUE, 4),
    ('88888888-8888-4888-a888-aaaa00000005', v_entity_id, v_tenant_id, 'saddle_bag', 'Borsa laterale', 'transport', 'per_rental', 3.0, ARRAY[]::TEXT[], TRUE, 5),
    ('88888888-8888-4888-a888-aaaa00000006', v_entity_id, v_tenant_id, 'repair_kit', 'Kit riparazione', 'safety', 'per_rental', 2.0, ARRAY[]::TEXT[], TRUE, 6),
    ('88888888-8888-4888-a888-aaaa00000007', v_entity_id, v_tenant_id, 'insurance_basic', 'Assicurazione Basic', 'insurance', 'per_day', 3.0, ARRAY[]::TEXT[], TRUE, 7),
    ('88888888-8888-4888-a888-aaaa00000008', v_entity_id, v_tenant_id, 'insurance_standard', 'Assicurazione Standard', 'insurance', 'per_day', 6.0, ARRAY[]::TEXT[], TRUE, 8),
    ('88888888-8888-4888-a888-aaaa00000009', v_entity_id, v_tenant_id, 'insurance_premium', 'Assicurazione Premium', 'insurance', 'per_day', 10.0, ARRAY[]::TEXT[], TRUE, 9)
  ON CONFLICT (id) DO NOTHING;

  -- pricing rules (5 rules)
  INSERT INTO public.bike_rental_pricing_rules (id, bike_rental_id, tenant_id, rule_name, rule_type, applies_to, config, adjustment_type, adjustment_value, priority, active) VALUES
    ('99999999-9999-4999-a999-aaaa00000001', v_entity_id, v_tenant_id, 'Alta stagione apr-set', 'season', ARRAY['bike'], '{"startDate":"2026-04-01","endDate":"2026-09-30"}'::jsonb, 'percent', 15, 100, TRUE),
    ('99999999-9999-4999-a999-aaaa00000002', v_entity_id, v_tenant_id, 'Weekend +10%', 'day_of_week', ARRAY['bike'], '{"days":[0,6]}'::jsonb, 'percent', 10, 90, TRUE),
    ('99999999-9999-4999-a999-aaaa00000003', v_entity_id, v_tenant_id, 'Settimana -20%', 'duration_tier', ARRAY['bike'], '{"minHours":168,"maxHours":99999}'::jsonb, 'percent', -20, 50, TRUE),
    ('99999999-9999-4999-a999-aaaa00000004', v_entity_id, v_tenant_id, 'Gruppo 5+ -10%', 'group_size', ARRAY['bike'], '{"minSize":5,"maxSize":999}'::jsonb, 'percent', -10, 70, TRUE),
    ('99999999-9999-4999-a999-aaaa00000005', v_entity_id, v_tenant_id, 'Peak hours 10-16 +10%', 'time_of_day', ARRAY['bike'], '{"startTime":"10:00","endTime":"16:00"}'::jsonb, 'percent', 10, 80, TRUE),
    ('99999999-9999-4999-a999-aaaa00000006', v_entity_id, v_tenant_id, 'One-way fee', 'one_way_fee', ARRAY['bike'], '{"baseFee":25,"perKm":1.2}'::jsonb, 'fixed', 0, 95, TRUE),
    ('99999999-9999-4999-a999-aaaa00000007', v_entity_id, v_tenant_id, 'Delivery hotel', 'delivery_fee', ARRAY['bike'], '{"baseFee":10,"perKm":1.5,"maxKm":25}'::jsonb, 'fixed', 0, 95, TRUE)
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE 'Alpina Bikes pricing seeded: 7 bike_types, 9 addons, 7 rules';
END $$;
