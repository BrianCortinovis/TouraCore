-- 00096: Demo seed Alpina Bikes Gardone (multi-vertical briansnow86 tenant)
-- Dipende da: 00093-00095 + tenant villa-irabo esistente
-- Modulo: Bike Rental M038/S04
-- Idempotente via ON CONFLICT DO NOTHING

DO $$
DECLARE
  v_tenant_id UUID;
  v_entity_id UUID := '11111111-1111-4111-a111-aaaa00000001';
  v_loc_centro UUID := '22222222-2222-4222-a222-aaaa00000001';
  v_loc_salo UUID := '22222222-2222-4222-a222-aaaa00000002';
  v_loc_limone UUID := '22222222-2222-4222-a222-aaaa00000003';
  v_bike_id UUID;
  v_res_id UUID;
  i INT;
  bike_types_arr TEXT[] := ARRAY['mtb','e_city','e_mtb','road','cargo','folding','kids','hybrid'];
  chosen_type TEXT;
BEGIN
  SELECT id INTO v_tenant_id FROM public.tenants WHERE slug = 'villa-irabo' LIMIT 1;
  IF v_tenant_id IS NULL THEN
    RAISE NOTICE 'Tenant villa-irabo not found, skipping seed';
    RETURN;
  END IF;

  -- 1. Entity bike_rental
  INSERT INTO public.entities (id, tenant_id, kind, slug, name, description, short_description, management_mode, is_active)
  VALUES (
    v_entity_id, v_tenant_id, 'bike_rental', 'alpina-bikes-gardone',
    'Alpina Bikes Gardone Riviera',
    'Noleggio bici e e-bike sul lago di Garda. 30 mezzi tra MTB, e-city, e-mtb, road, cargo, folding, kids e hybrid. 3 depositi: Gardone centro, Salò, Limone. Consegna in hotel disponibile.',
    'Noleggio bici e e-bike Lago di Garda — 3 depositi, 30 mezzi',
    'self_service', TRUE
  ) ON CONFLICT (id) DO NOTHING;

  -- 2. Bike rental config
  INSERT INTO public.bike_rentals (
    id, tenant_id, bike_types, capacity_total, avg_rental_hours,
    address, city, zip, country, latitude, longitude,
    opening_hours, buffer_minutes,
    deposit_policy, cancellation_policy, late_fee_policy,
    insurance_config, delivery_config, one_way_config,
    rental_agreement_md
  ) VALUES (
    v_entity_id, v_tenant_id,
    ARRAY['mtb','e_city','e_mtb','road','cargo','folding','kids','hybrid'],
    30, 4,
    'Corso Zanardelli 150', 'Gardone Riviera', '25083', 'IT',
    45.6246, 10.5672,
    '{"mon":["09:00-19:00"],"tue":["09:00-19:00"],"wed":["09:00-19:00"],"thu":["09:00-19:00"],"fri":["09:00-19:00"],"sat":["08:30-20:00"],"sun":["08:30-20:00"]}'::jsonb,
    15,
    '{"mode":"preauth","per_bike":150,"per_ebike":300,"currency":"EUR"}'::jsonb,
    '{"free_until_hours":24,"partial_until_hours":6,"partial_pct":50,"no_refund_after":"pickup_time"}'::jsonb,
    '{"grace_minutes":15,"per_hour":10,"max_daily":60,"currency":"EUR"}'::jsonb,
    '{"tiers":[{"key":"basic","name":"Basic RC","price":3,"coverage":"furto"},{"key":"standard","name":"Standard","price":6,"coverage":"furto+danni"},{"key":"premium","name":"Premium","price":10,"coverage":"furto+danni+RC"}]}'::jsonb,
    '{"enabled":true,"max_km":25,"base_fee":10,"per_km":1.5}'::jsonb,
    '{"enabled":true,"base_fee":25,"per_km":1.2}'::jsonb,
    '# Contratto di Noleggio Alpina Bikes\n\nIl Cliente dichiara di ricevere la bicicletta in buono stato di funzionamento...\n(template v1, rev. 2026)'
  ) ON CONFLICT (id) DO NOTHING;

  -- 3. Locations (3 depot)
  INSERT INTO public.bike_locations (id, bike_rental_id, tenant_id, name, address, city, zip, latitude, longitude, opening_hours, is_pickup, is_return, capacity, display_order, active)
  VALUES
    (v_loc_centro, v_entity_id, v_tenant_id, 'Depot Gardone Centro', 'Corso Zanardelli 150', 'Gardone Riviera', '25083', 45.6246, 10.5672, '{"mon":["09:00-19:00"],"tue":["09:00-19:00"],"wed":["09:00-19:00"],"thu":["09:00-19:00"],"fri":["09:00-19:00"],"sat":["08:30-20:00"],"sun":["08:30-20:00"]}'::jsonb, TRUE, TRUE, 15, 1, TRUE),
    (v_loc_salo, v_entity_id, v_tenant_id, 'Depot Salò Lungolago', 'Lungolago Zanardelli 42', 'Salò', '25087', 45.6063, 10.5243, '{"mon":["09:00-18:00"],"tue":["09:00-18:00"],"wed":["09:00-18:00"],"thu":["09:00-18:00"],"fri":["09:00-18:00"],"sat":["08:30-19:30"],"sun":["08:30-19:30"]}'::jsonb, TRUE, TRUE, 10, 2, TRUE),
    (v_loc_limone, v_entity_id, v_tenant_id, 'Depot Limone sul Garda', 'Via Porto 5', 'Limone sul Garda', '25010', 45.8173, 10.7849, '{"mon":["09:00-19:00"],"tue":["09:00-19:00"],"wed":["09:00-19:00"],"thu":["09:00-19:00"],"fri":["09:00-19:00"],"sat":["08:30-20:00"],"sun":["08:30-20:00"]}'::jsonb, TRUE, TRUE, 5, 3, TRUE)
  ON CONFLICT (id) DO NOTHING;

  -- 4. Fleet 30 bikes
  -- Composizione: 10 mtb + 8 e-city + 5 e-mtb + 4 road + 2 cargo + 1 tandem(folding) + rest kids/hybrid
  -- Usiamo loop deterministico per idempotenza
  FOR i IN 1..30 LOOP
    v_bike_id := ('33333333-3333-4333-a333-aaaa' || LPAD(i::TEXT, 8, '0'))::UUID;
    chosen_type := CASE
      WHEN i BETWEEN 1 AND 10 THEN 'mtb'
      WHEN i BETWEEN 11 AND 18 THEN 'e_city'
      WHEN i BETWEEN 19 AND 23 THEN 'e_mtb'
      WHEN i BETWEEN 24 AND 27 THEN 'road'
      WHEN i BETWEEN 28 AND 29 THEN 'cargo'
      ELSE 'kids'
    END;

    INSERT INTO public.bikes (
      id, bike_rental_id, tenant_id, location_id,
      name, bike_type, brand, model, model_year, serial_number,
      frame_size, wheel_size, color,
      purchase_price, purchase_date, insurance_value,
      is_electric, battery_capacity_wh, battery_cycles, battery_health_pct, last_charge_pct, last_charged_at, motor_brand,
      status, condition_grade, total_km,
      last_maintenance_at, next_maintenance_at,
      photos
    ) VALUES (
      v_bike_id, v_entity_id, v_tenant_id,
      CASE WHEN i % 3 = 0 THEN v_loc_salo WHEN i % 5 = 0 THEN v_loc_limone ELSE v_loc_centro END,
      chosen_type || ' #' || LPAD(i::TEXT, 3, '0'),
      chosen_type,
      CASE chosen_type
        WHEN 'e_city' THEN 'Bianchi'
        WHEN 'e_mtb' THEN 'Specialized'
        WHEN 'mtb' THEN 'Trek'
        WHEN 'road' THEN 'Pinarello'
        WHEN 'cargo' THEN 'Riese&Müller'
        ELSE 'Scott'
      END,
      'Model-' || i,
      2024 + (i % 2),
      'SN-ALP-' || LPAD(i::TEXT, 6, '0'),
      CASE WHEN chosen_type = 'kids' THEN 'S' WHEN i % 3 = 0 THEN 'M' WHEN i % 3 = 1 THEN 'L' ELSE 'XL' END,
      CASE WHEN chosen_type = 'kids' THEN '24' WHEN chosen_type = 'road' THEN '28' ELSE '29' END,
      CASE (i % 5) WHEN 0 THEN 'nero' WHEN 1 THEN 'rosso' WHEN 2 THEN 'blu' WHEN 3 THEN 'bianco' ELSE 'verde' END,
      CASE chosen_type WHEN 'e_mtb' THEN 4200 WHEN 'e_city' THEN 2800 WHEN 'cargo' THEN 5500 WHEN 'road' THEN 3200 WHEN 'mtb' THEN 1800 ELSE 800 END,
      DATE '2024-03-01' + (i * 3),
      CASE chosen_type WHEN 'e_mtb' THEN 3800 WHEN 'e_city' THEN 2400 WHEN 'cargo' THEN 5000 WHEN 'road' THEN 2800 WHEN 'mtb' THEN 1500 ELSE 600 END,
      chosen_type LIKE 'e\_%',
      CASE WHEN chosen_type LIKE 'e\_%' THEN 625 ELSE NULL END,
      CASE WHEN chosen_type LIKE 'e\_%' THEN (i * 8) % 300 ELSE 0 END,
      CASE WHEN chosen_type LIKE 'e\_%' THEN 100 - ((i * 2) % 15) ELSE 100 END,
      CASE WHEN chosen_type LIKE 'e\_%' THEN 80 + (i % 20) ELSE NULL END,
      CASE WHEN chosen_type LIKE 'e\_%' THEN NOW() - (INTERVAL '1 hour' * (i % 12)) ELSE NULL END,
      CASE WHEN chosen_type LIKE 'e\_%' THEN (ARRAY['Bosch','Shimano','Yamaha'])[(i % 3) + 1] ELSE NULL END,
      CASE WHEN i = 5 THEN 'maintenance' WHEN i = 13 THEN 'damaged' WHEN i = 22 THEN 'rented' ELSE 'available' END,
      CASE WHEN i < 10 THEN 'A' WHEN i < 20 THEN 'B' ELSE 'C' END,
      (i * 127.5),
      NOW() - (INTERVAL '1 day' * (i * 3)),
      NOW() + (INTERVAL '1 day' * (30 - (i % 30))),
      ARRAY[]::TEXT[]
    ) ON CONFLICT (id) DO NOTHING;
  END LOOP;

  -- 5. 20 reservations storiche (mix status)
  FOR i IN 1..20 LOOP
    v_res_id := ('44444444-4444-4444-a444-aaaa' || LPAD(i::TEXT, 8, '0'))::UUID;

    INSERT INTO public.bike_rental_reservations (
      id, bike_rental_id, tenant_id, reference_code,
      guest_name, guest_email, guest_phone,
      guest_height_cm, guest_experience,
      rental_start, rental_end,
      actual_pickup_at, actual_return_at,
      pickup_location_id, return_location_id,
      subtotal, addons_total, delivery_fee, one_way_fee, discount, tax_amount, total_amount, paid_amount, currency,
      deposit_amount, insurance_tier, status, source
    ) VALUES (
      v_res_id, v_entity_id, v_tenant_id,
      'BK-2026-' || LPAD(i::TEXT, 5, '0'),
      (ARRAY['Marco Rossi','Laura Bianchi','Anna Müller','John Smith','Sophie Dupont','Hans Weber','Elena Costa','Pedro García','Yuki Tanaka','Emma Schmidt','Luca Ferrari','Sofia Romano','Oliver Brown','Lucia Conti','David Lee','Chiara Greco','Noah Wilson','Greta Moretti','Leo Jensen','Valentina Ricci'])[i],
      LOWER(REPLACE((ARRAY['marco','laura','anna','john','sophie','hans','elena','pedro','yuki','emma','luca','sofia','oliver','lucia','david','chiara','noah','greta','leo','valentina'])[i], ' ', '')) || '@example.com',
      '+39 34' || (i * 123 % 10) || ' ' || LPAD((i * 7919)::TEXT, 7, '0'),
      160 + (i * 3) % 30,
      (ARRAY['beginner','intermediate','expert','pro'])[(i % 4) + 1],
      NOW() - (INTERVAL '1 day' * ((21 - i) * 3)),
      NOW() - (INTERVAL '1 day' * ((21 - i) * 3)) + (INTERVAL '1 hour' * (2 + (i % 8))),
      CASE WHEN i <= 15 THEN NOW() - (INTERVAL '1 day' * ((21 - i) * 3)) ELSE NULL END,
      CASE WHEN i <= 13 THEN NOW() - (INTERVAL '1 day' * ((21 - i) * 3)) + (INTERVAL '1 hour' * (2 + (i % 8))) ELSE NULL END,
      CASE (i % 3) WHEN 0 THEN v_loc_centro WHEN 1 THEN v_loc_salo ELSE v_loc_limone END,
      CASE (i % 5) WHEN 0 THEN v_loc_salo WHEN 1 THEN v_loc_limone ELSE v_loc_centro END,
      25 + (i * 3.5), (i % 4) * 4.5, CASE WHEN i % 7 = 0 THEN 15 ELSE 0 END, 0, CASE WHEN i % 6 = 0 THEN 5 ELSE 0 END,
      ROUND(((25 + (i * 3.5)) * 0.22)::NUMERIC, 2),
      ROUND(((25 + (i * 3.5)) + ((i % 4) * 4.5) + CASE WHEN i % 7 = 0 THEN 15 ELSE 0 END - CASE WHEN i % 6 = 0 THEN 5 ELSE 0 END)::NUMERIC, 2),
      CASE WHEN i <= 15 THEN ROUND(((25 + (i * 3.5)) + ((i % 4) * 4.5))::NUMERIC, 2) ELSE 0 END,
      'EUR',
      150,
      (ARRAY['none','basic','standard','premium'])[(i % 4) + 1],
      CASE
        WHEN i <= 13 THEN 'completed'
        WHEN i = 14 THEN 'active'
        WHEN i = 15 THEN 'checked_in'
        WHEN i IN (16,17) THEN 'confirmed'
        WHEN i = 18 THEN 'cancelled'
        WHEN i = 19 THEN 'no_show'
        ELSE 'pending'
      END,
      CASE (i % 4) WHEN 0 THEN 'widget' WHEN 1 THEN 'direct' WHEN 2 THEN 'portal' ELSE 'walk_in' END
    ) ON CONFLICT (id) DO NOTHING;

    -- 1-2 items per reservation
    INSERT INTO public.bike_rental_reservation_items (
      id, reservation_id, tenant_id, bike_type, frame_size, rider_name, rider_height_cm, base_price, line_total
    ) VALUES (
      ('55555555-5555-4555-a555-aaaa' || LPAD((i * 2 - 1)::TEXT, 8, '0'))::UUID,
      v_res_id, v_tenant_id,
      CASE (i % 5) WHEN 0 THEN 'e_city' WHEN 1 THEN 'mtb' WHEN 2 THEN 'road' WHEN 3 THEN 'e_mtb' ELSE 'hybrid' END,
      CASE WHEN i % 3 = 0 THEN 'M' WHEN i % 3 = 1 THEN 'L' ELSE 'XL' END,
      (ARRAY['Marco Rossi','Laura Bianchi','Anna Müller','John Smith','Sophie Dupont','Hans Weber','Elena Costa','Pedro García','Yuki Tanaka','Emma Schmidt','Luca Ferrari','Sofia Romano','Oliver Brown','Lucia Conti','David Lee','Chiara Greco','Noah Wilson','Greta Moretti','Leo Jensen','Valentina Ricci'])[i],
      160 + (i * 3) % 30,
      25 + (i * 3.5), 25 + (i * 3.5)
    ) ON CONFLICT (id) DO NOTHING;

    -- addon helmet su tutti
    INSERT INTO public.bike_rental_reservation_addons (id, reservation_id, tenant_id, addon_key, addon_label, quantity, unit_price, line_total)
    VALUES (
      ('66666666-6666-4666-a666-aaaa' || LPAD(i::TEXT, 8, '0'))::UUID,
      v_res_id, v_tenant_id, 'helmet', 'Casco', 1, 3.0, 3.0
    ) ON CONFLICT (id) DO NOTHING;
  END LOOP;

  RAISE NOTICE 'Alpina Bikes demo seeded: tenant=%, entity=%, 3 locations, 30 bikes, 20 reservations', v_tenant_id, v_entity_id;
END $$;
