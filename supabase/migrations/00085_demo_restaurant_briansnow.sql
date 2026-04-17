-- 00085: Demo restaurant completo per tenant villa-irabo (briansnow86)
-- Idempotent: ON CONFLICT DO NOTHING
-- Ristorante "Trattoria del Borgo" dentro hotel Grand Hotel Adriatico

DO $$
DECLARE
  v_tenant_id UUID := '89147f14-711e-4195-8e82-dd54f24e9457';
  v_parent_entity_id UUID := '10000000-0000-0000-0000-000000000001'; -- Grand Hotel Adriatico
  v_restaurant_entity_id UUID := '20000000-0000-0000-0000-000000000001';
  v_room_principale_id UUID := '21000000-0000-0000-0000-000000000001';
  v_room_dehors_id UUID := '21000000-0000-0000-0000-000000000002';
  v_room_prive_id UUID := '21000000-0000-0000-0000-000000000003';
  v_cat_antipasti UUID := '22000000-0000-0000-0000-000000000001';
  v_cat_primi UUID := '22000000-0000-0000-0000-000000000002';
  v_cat_secondi UUID := '22000000-0000-0000-0000-000000000003';
  v_cat_dessert UUID := '22000000-0000-0000-0000-000000000004';
  v_cat_vini UUID := '22000000-0000-0000-0000-000000000005';
BEGIN

-- ============================================================================
-- 1. ENTITY restaurant (kind=restaurant)
-- ============================================================================

INSERT INTO public.entities (id, tenant_id, slug, name, kind, is_active, country_override, management_mode, created_at, updated_at)
VALUES (v_restaurant_entity_id, v_tenant_id, 'trattoria-del-borgo', 'Trattoria del Borgo', 'restaurant', TRUE, 'IT', 'self_service', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- ============================================================================
-- 2. RESTAURANT extension (00064 schema)
-- ============================================================================

INSERT INTO public.restaurants (
  id, tenant_id,
  cuisine_type, price_range, capacity_total, avg_turn_minutes,
  parent_entity_id,
  opening_hours, services,
  reservation_mode,
  deposit_policy, no_show_policy, tax_config,
  settings,
  created_at, updated_at
) VALUES (
  v_restaurant_entity_id, v_tenant_id,
  ARRAY['italiana','tradizionale','pesce','pizza']::TEXT[],
  3, 80, 90,
  v_parent_entity_id,
  '{
    "mon": [{"open":"12:00","close":"15:00"},{"open":"19:00","close":"23:00"}],
    "tue": [{"open":"12:00","close":"15:00"},{"open":"19:00","close":"23:00"}],
    "wed": [{"open":"19:00","close":"23:00"}],
    "thu": [{"open":"12:00","close":"15:00"},{"open":"19:00","close":"23:00"}],
    "fri": [{"open":"12:00","close":"15:00"},{"open":"19:00","close":"23:30"}],
    "sat": [{"open":"12:00","close":"15:00"},{"open":"19:00","close":"23:30"}],
    "sun": [{"open":"12:00","close":"15:00"},{"open":"19:00","close":"22:30"}]
  }'::jsonb,
  '[
    {"name":"Pranzo","start":"12:00","end":"15:00","max_covers":50},
    {"name":"Cena","start":"19:00","end":"23:00","max_covers":80}
  ]'::jsonb,
  'slot',
  '{"enabled":true,"amount_per_cover":15,"above_party":6}'::jsonb,
  '{"enabled":true,"capture_after_minutes":15}'::jsonb,
  '{"cover_charge":2.50,"service_charge_pct":0,"vat_food":10,"vat_beverage":22}'::jsonb,
  jsonb_build_object(
    'legal_name', 'Trattoria del Borgo SRL',
    'vat_number', 'IT12345678901',
    'fiscal_code', 'IT12345678901',
    'address', 'Via Roma 42',
    'city', 'Bergamo',
    'zip', '24100',
    'province', 'BG',
    'fiscal_regime', 'RF01',
    'rt_serial', 'EPSON-FP90-DEMO-001',
    'booking_template', 'luxury'
  ),
  NOW(), NOW()
)
ON CONFLICT (id) DO UPDATE SET cuisine_type = EXCLUDED.cuisine_type;

-- ============================================================================
-- 3. SALE (restaurant_rooms)
-- ============================================================================

INSERT INTO public.restaurant_rooms (id, restaurant_id, name, zone_type, order_idx, layout, active)
VALUES
  (v_room_principale_id, v_restaurant_entity_id, 'Sala Principale', 'indoor', 0,
   '{"width":1200,"height":800,"background":"#fafafa"}'::jsonb, TRUE),
  (v_room_dehors_id, v_restaurant_entity_id, 'Dehors', 'outdoor', 1,
   '{"width":1000,"height":600,"background":"#f0f9e8"}'::jsonb, TRUE),
  (v_room_prive_id, v_restaurant_entity_id, 'Privé', 'private', 2,
   '{"width":600,"height":400,"background":"#fff5e6"}'::jsonb, TRUE)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 4. TAVOLI (restaurant_tables) - 20 tavoli total
-- ============================================================================

INSERT INTO public.restaurant_tables (
  id, restaurant_id, room_id, code, shape,
  seats_min, seats_max, seats_default, joinable_with, attributes,
  position, active
) VALUES
  -- Sala principale: 12 tavoli
  ('23000000-0000-0000-0000-000000000001', v_restaurant_entity_id, v_room_principale_id, 'P1', 'square', 1, 4, 2, '{}', '{window,quiet}', '{"x":50,"y":50,"w":80,"h":80,"rotation":0}'::jsonb, TRUE),
  ('23000000-0000-0000-0000-000000000002', v_restaurant_entity_id, v_room_principale_id, 'P2', 'square', 1, 4, 2, '{}', '{window}', '{"x":150,"y":50,"w":80,"h":80,"rotation":0}'::jsonb, TRUE),
  ('23000000-0000-0000-0000-000000000003', v_restaurant_entity_id, v_room_principale_id, 'P3', 'round', 2, 4, 4, '{}', '{}', '{"x":300,"y":80,"w":100,"h":100,"rotation":0}'::jsonb, TRUE),
  ('23000000-0000-0000-0000-000000000004', v_restaurant_entity_id, v_room_principale_id, 'P4', 'round', 2, 4, 4, '{}', '{}', '{"x":450,"y":80,"w":100,"h":100,"rotation":0}'::jsonb, TRUE),
  ('23000000-0000-0000-0000-000000000005', v_restaurant_entity_id, v_room_principale_id, 'P5', 'rect', 4, 8, 6, '{}', '{}', '{"x":600,"y":80,"w":160,"h":80,"rotation":0}'::jsonb, TRUE),
  ('23000000-0000-0000-0000-000000000006', v_restaurant_entity_id, v_room_principale_id, 'P6', 'rect', 4, 8, 6, '{}', '{}', '{"x":50,"y":250,"w":160,"h":80,"rotation":0}'::jsonb, TRUE),
  ('23000000-0000-0000-0000-000000000007', v_restaurant_entity_id, v_room_principale_id, 'P7', 'square', 2, 4, 4, '{}', '{}', '{"x":300,"y":250,"w":80,"h":80,"rotation":0}'::jsonb, TRUE),
  ('23000000-0000-0000-0000-000000000008', v_restaurant_entity_id, v_room_principale_id, 'P8', 'square', 2, 4, 4, '{}', '{high_chair_ok}', '{"x":420,"y":250,"w":80,"h":80,"rotation":0}'::jsonb, TRUE),
  ('23000000-0000-0000-0000-000000000009', v_restaurant_entity_id, v_room_principale_id, 'P9', 'round', 4, 6, 6, '{}', '{}', '{"x":550,"y":250,"w":100,"h":100,"rotation":0}'::jsonb, TRUE),
  ('23000000-0000-0000-0000-000000000010', v_restaurant_entity_id, v_room_principale_id, 'P10', 'square', 1, 2, 2, '{}', '{quiet}', '{"x":50,"y":420,"w":60,"h":60,"rotation":0}'::jsonb, TRUE),
  ('23000000-0000-0000-0000-000000000011', v_restaurant_entity_id, v_room_principale_id, 'P11', 'square', 1, 2, 2, '{}', '{quiet}', '{"x":130,"y":420,"w":60,"h":60,"rotation":0}'::jsonb, TRUE),
  ('23000000-0000-0000-0000-000000000012', v_restaurant_entity_id, v_room_principale_id, 'P12', 'round', 6, 10, 8, '{}', '{vip}', '{"x":400,"y":420,"w":140,"h":140,"rotation":0}'::jsonb, TRUE),

  -- Dehors: 6 tavoli
  ('23000000-0000-0000-0000-000000000013', v_restaurant_entity_id, v_room_dehors_id, 'D1', 'square', 2, 4, 4, '{}', '{pet_ok}', '{"x":50,"y":50,"w":80,"h":80,"rotation":0}'::jsonb, TRUE),
  ('23000000-0000-0000-0000-000000000014', v_restaurant_entity_id, v_room_dehors_id, 'D2', 'square', 2, 4, 4, '{}', '{pet_ok}', '{"x":150,"y":50,"w":80,"h":80,"rotation":0}'::jsonb, TRUE),
  ('23000000-0000-0000-0000-000000000015', v_restaurant_entity_id, v_room_dehors_id, 'D3', 'round', 4, 6, 6, '{}', '{pet_ok}', '{"x":300,"y":80,"w":100,"h":100,"rotation":0}'::jsonb, TRUE),
  ('23000000-0000-0000-0000-000000000016', v_restaurant_entity_id, v_room_dehors_id, 'D4', 'round', 4, 6, 6, '{}', '{pet_ok}', '{"x":450,"y":80,"w":100,"h":100,"rotation":0}'::jsonb, TRUE),
  ('23000000-0000-0000-0000-000000000017', v_restaurant_entity_id, v_room_dehors_id, 'D5', 'rect', 6, 10, 8, '{}', '{pet_ok}', '{"x":50,"y":250,"w":180,"h":80,"rotation":0}'::jsonb, TRUE),
  ('23000000-0000-0000-0000-000000000018', v_restaurant_entity_id, v_room_dehors_id, 'D6', 'rect', 6, 10, 8, '{}', '{pet_ok}', '{"x":300,"y":250,"w":180,"h":80,"rotation":0}'::jsonb, TRUE),

  -- Privé: 2 tavoli
  ('23000000-0000-0000-0000-000000000019', v_restaurant_entity_id, v_room_prive_id, 'V1', 'round', 8, 12, 10, '{}', '{vip,quiet}', '{"x":100,"y":100,"w":160,"h":160,"rotation":0}'::jsonb, TRUE),
  ('23000000-0000-0000-0000-000000000020', v_restaurant_entity_id, v_room_prive_id, 'V2', 'rect', 6, 8, 8, '{}', '{vip}', '{"x":350,"y":100,"w":180,"h":100,"rotation":0}'::jsonb, TRUE)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 5. MENU CATEGORIES
-- ============================================================================

INSERT INTO public.menu_categories (id, restaurant_id, name, name_i18n, order_idx, available_services, active)
VALUES
  (v_cat_antipasti, v_restaurant_entity_id, 'Antipasti', '{"en":"Starters"}'::jsonb, 1, '{lunch,dinner}', TRUE),
  (v_cat_primi, v_restaurant_entity_id, 'Primi', '{"en":"First courses"}'::jsonb, 2, '{lunch,dinner}', TRUE),
  (v_cat_secondi, v_restaurant_entity_id, 'Secondi', '{"en":"Main courses"}'::jsonb, 3, '{lunch,dinner}', TRUE),
  (v_cat_dessert, v_restaurant_entity_id, 'Dessert', '{"en":"Desserts"}'::jsonb, 4, '{lunch,dinner}', TRUE),
  (v_cat_vini, v_restaurant_entity_id, 'Vini & Bevande', '{"en":"Wines & Drinks"}'::jsonb, 5, '{lunch,dinner}', TRUE)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 6. MENU ITEMS (20 piatti reali con allergeni UE 1169/2011)
-- ============================================================================

INSERT INTO public.menu_items (
  id, restaurant_id, category_id, name, name_i18n, description,
  price_base, vat_pct, course_number, station_code,
  allergens, available_services, order_idx, active
) VALUES
  -- ANTIPASTI
  ('24000000-0000-0000-0000-000000000001', v_restaurant_entity_id, v_cat_antipasti,
    'Tagliere di salumi e formaggi', '{"en":"Cured meats and cheese platter"}'::jsonb,
    'Selezione di salumi tipici bergamaschi con formaggi DOP, miele e mostarda',
    18.00, 10, 1, 'cold', ARRAY['milk','sulphites']::TEXT[], '{lunch,dinner}', 1, TRUE),

  ('24000000-0000-0000-0000-000000000002', v_restaurant_entity_id, v_cat_antipasti,
    'Bruschetta al pomodoro', '{"en":"Tomato bruschetta"}'::jsonb,
    'Pane tostato con pomodorini freschi, basilico e olio EVO',
    8.00, 10, 1, 'cold', ARRAY['gluten']::TEXT[], '{lunch,dinner}', 2, TRUE),

  ('24000000-0000-0000-0000-000000000003', v_restaurant_entity_id, v_cat_antipasti,
    'Carpaccio di branzino', '{"en":"Sea bass carpaccio"}'::jsonb,
    'Branzino crudo con olio agrumato, finocchio e pepe rosa',
    16.00, 10, 1, 'cold', ARRAY['fish','sulphites']::TEXT[], '{lunch,dinner}', 3, TRUE),

  ('24000000-0000-0000-0000-000000000004', v_restaurant_entity_id, v_cat_antipasti,
    'Polpo arrostito', '{"en":"Grilled octopus"}'::jsonb,
    'Polpo cotto a bassa temperatura, crema di patate e olive taggiasche',
    20.00, 10, 1, 'hot', ARRAY['molluscs']::TEXT[], '{dinner}', 4, TRUE),

  -- PRIMI
  ('24000000-0000-0000-0000-000000000005', v_restaurant_entity_id, v_cat_primi,
    'Casoncelli alla bergamasca', '{"en":"Bergamasque casoncelli"}'::jsonb,
    'Pasta ripiena con burro fuso, salvia e pancetta croccante',
    14.00, 10, 2, 'hot', ARRAY['gluten','eggs','milk']::TEXT[], '{lunch,dinner}', 1, TRUE),

  ('24000000-0000-0000-0000-000000000006', v_restaurant_entity_id, v_cat_primi,
    'Risotto agli scampi', '{"en":"Scampi risotto"}'::jsonb,
    'Riso Carnaroli mantecato con scampi freschi e bisque',
    18.00, 10, 2, 'hot', ARRAY['crustaceans','milk','sulphites']::TEXT[], '{lunch,dinner}', 2, TRUE),

  ('24000000-0000-0000-0000-000000000007', v_restaurant_entity_id, v_cat_primi,
    'Spaghetti alle vongole', '{"en":"Spaghetti vongole"}'::jsonb,
    'Spaghetti di Gragnano con vongole veraci, aglio, prezzemolo e peperoncino',
    16.00, 10, 2, 'hot', ARRAY['gluten','molluscs']::TEXT[], '{lunch,dinner}', 3, TRUE),

  ('24000000-0000-0000-0000-000000000008', v_restaurant_entity_id, v_cat_primi,
    'Tagliatelle al ragù di cinghiale', '{"en":"Tagliatelle wild boar ragout"}'::jsonb,
    'Pasta fresca tirata a mano con ragù di cinghiale brasato 8 ore',
    15.00, 10, 2, 'hot', ARRAY['gluten','eggs','sulphites']::TEXT[], '{lunch,dinner}', 4, TRUE),

  -- SECONDI
  ('24000000-0000-0000-0000-000000000009', v_restaurant_entity_id, v_cat_secondi,
    'Branzino in crosta di sale', '{"en":"Sea bass in salt crust"}'::jsonb,
    'Branzino intero (350g) cotto in crosta di sale di Cervia',
    24.00, 10, 3, 'hot', ARRAY['fish']::TEXT[], '{dinner}', 1, TRUE),

  ('24000000-0000-0000-0000-000000000010', v_restaurant_entity_id, v_cat_secondi,
    'Costata di Fassona', '{"en":"Fassona ribeye"}'::jsonb,
    'Costata Fassona piemontese (500g) alla griglia con sale Maldon',
    36.00, 10, 3, 'grill', ARRAY[]::TEXT[], '{dinner}', 2, TRUE),

  ('24000000-0000-0000-0000-000000000011', v_restaurant_entity_id, v_cat_secondi,
    'Stinco di maiale brasato', '{"en":"Braised pork shank"}'::jsonb,
    'Stinco brasato 6 ore con polenta taragna e cipolle caramellate',
    22.00, 10, 3, 'hot', ARRAY['sulphites']::TEXT[], '{dinner}', 3, TRUE),

  ('24000000-0000-0000-0000-000000000012', v_restaurant_entity_id, v_cat_secondi,
    'Frittura di paranza', '{"en":"Mixed fried fish"}'::jsonb,
    'Selezione di pesce fritto: triglie, calamari, gamberi e merluzzetto',
    22.00, 10, 3, 'hot', ARRAY['fish','crustaceans','molluscs','gluten']::TEXT[], '{lunch,dinner}', 4, TRUE),

  ('24000000-0000-0000-0000-000000000013', v_restaurant_entity_id, v_cat_secondi,
    'Insalata Caesar', '{"en":"Caesar salad"}'::jsonb,
    'Lattuga romana, pollo grigliato, parmigiano, crostini e salsa Caesar',
    14.00, 10, 3, 'cold', ARRAY['gluten','eggs','milk','fish']::TEXT[], '{lunch}', 5, TRUE),

  -- DESSERT
  ('24000000-0000-0000-0000-000000000014', v_restaurant_entity_id, v_cat_dessert,
    'Tiramisù della casa', '{"en":"House tiramisu"}'::jsonb,
    'Ricetta tradizionale con mascarpone, savoiardi e caffè',
    7.00, 10, 4, 'pastry', ARRAY['gluten','eggs','milk']::TEXT[], '{lunch,dinner}', 1, TRUE),

  ('24000000-0000-0000-0000-000000000015', v_restaurant_entity_id, v_cat_dessert,
    'Panna cotta ai frutti rossi', '{"en":"Panna cotta with berries"}'::jsonb,
    'Panna cotta vaniglia con coulis di frutti di bosco',
    6.00, 10, 4, 'pastry', ARRAY['milk']::TEXT[], '{lunch,dinner}', 2, TRUE),

  ('24000000-0000-0000-0000-000000000016', v_restaurant_entity_id, v_cat_dessert,
    'Cannolo siciliano', '{"en":"Sicilian cannolo"}'::jsonb,
    'Cannolo croccante con ricotta freschissima, gocce di cioccolato e pistacchi',
    7.00, 10, 4, 'pastry', ARRAY['gluten','milk','nuts','eggs']::TEXT[], '{lunch,dinner}', 3, TRUE),

  -- VINI
  ('24000000-0000-0000-0000-000000000017', v_restaurant_entity_id, v_cat_vini,
    'Franciacorta DOCG bottiglia', '{"en":"Franciacorta DOCG bottle"}'::jsonb,
    'Bollicine lombarde 750ml',
    35.00, 22, 5, 'bar', ARRAY['sulphites']::TEXT[], '{lunch,dinner}', 1, TRUE),

  ('24000000-0000-0000-0000-000000000018', v_restaurant_entity_id, v_cat_vini,
    'Valcalepio Rosso DOC', '{"en":"Valcalepio red wine"}'::jsonb,
    'Vino rosso bergamasco 750ml',
    24.00, 22, 5, 'bar', ARRAY['sulphites']::TEXT[], '{lunch,dinner}', 2, TRUE),

  ('24000000-0000-0000-0000-000000000019', v_restaurant_entity_id, v_cat_vini,
    'Acqua minerale 750ml', '{"en":"Sparkling water 750ml"}'::jsonb,
    'Acqua naturale o frizzante',
    3.50, 10, 5, 'bar', ARRAY[]::TEXT[], '{lunch,dinner}', 3, TRUE),

  ('24000000-0000-0000-0000-000000000020', v_restaurant_entity_id, v_cat_vini,
    'Caffè espresso', '{"en":"Espresso coffee"}'::jsonb,
    'Caffè Illy',
    1.80, 10, 5, 'bar', ARRAY[]::TEXT[], '{lunch,dinner}', 4, TRUE)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 7. STAFF (5 dipendenti)
-- ============================================================================

INSERT INTO public.restaurant_staff (id, restaurant_id, full_name, role, hourly_rate, active, created_at)
VALUES
  ('25000000-0000-0000-0000-000000000001', v_restaurant_entity_id, 'Marco Rossi', 'chef', 18.00, TRUE, NOW()),
  ('25000000-0000-0000-0000-000000000002', v_restaurant_entity_id, 'Luca Bianchi', 'sous_chef', 14.00, TRUE, NOW()),
  ('25000000-0000-0000-0000-000000000003', v_restaurant_entity_id, 'Giulia Verdi', 'maitre', 13.00, TRUE, NOW()),
  ('25000000-0000-0000-0000-000000000004', v_restaurant_entity_id, 'Anna Neri', 'waiter', 11.00, TRUE, NOW()),
  ('25000000-0000-0000-0000-000000000005', v_restaurant_entity_id, 'Paolo Russo', 'barman', 12.00, TRUE, NOW())
ON CONFLICT (id) DO NOTHING;

-- Set PIN hash via RPC (bcrypt) per ognuno - PIN: 1111, 2222, 3333, 4444, 5555
DO $inner$
DECLARE
  staff RECORD;
  pins TEXT[] := ARRAY['1111','2222','3333','4444','5555'];
  i INT := 1;
BEGIN
  FOR staff IN SELECT id FROM public.restaurant_staff WHERE restaurant_id = '20000000-0000-0000-0000-000000000001' ORDER BY full_name LOOP
    UPDATE public.restaurant_staff
    SET pin_hash = extensions.crypt(pins[i], extensions.gen_salt('bf', 8))
    WHERE id = staff.id AND pin_hash IS NULL;
    i := i + 1;
  END LOOP;
END $inner$;

-- ============================================================================
-- 8. STAFF SHIFTS (settimana corrente)
-- ============================================================================

INSERT INTO public.staff_shifts (restaurant_id, staff_id, start_at, end_at, role, status, created_at)
SELECT
  v_restaurant_entity_id,
  s.id,
  d.shift_date + s.start_time,
  d.shift_date + s.end_time,
  s.role,
  'planned',
  NOW()
FROM
  (SELECT generate_series(CURRENT_DATE, CURRENT_DATE + INTERVAL '6 days', '1 day')::date AS shift_date) d,
  (
    SELECT id, role, '11:00'::TIME AS start_time, '15:30'::TIME AS end_time FROM public.restaurant_staff WHERE restaurant_id = v_restaurant_entity_id AND role IN ('chef','sous_chef','maitre')
    UNION ALL
    SELECT id, role, '18:00'::TIME, '23:30'::TIME FROM public.restaurant_staff WHERE restaurant_id = v_restaurant_entity_id
  ) s
WHERE NOT EXISTS (
  SELECT 1 FROM public.staff_shifts ss
  WHERE ss.staff_id = s.id AND ss.start_at = (d.shift_date + s.start_time)
)
LIMIT 50;

-- ============================================================================
-- 9. INTEGRATIONS placeholder (config_encrypted vuoti = sandbox mode)
-- ============================================================================

INSERT INTO public.restaurant_integrations (restaurant_id, provider, is_active, config_encrypted, config_meta, created_at, updated_at)
VALUES
  (v_restaurant_entity_id, 'thefork', FALSE, NULL, '{}'::jsonb, NOW(), NOW()),
  (v_restaurant_entity_id, 'google_reserve', FALSE, NULL, '{}'::jsonb, NOW(), NOW()),
  (v_restaurant_entity_id, 'rt_fiscal_it', FALSE, NULL, '{}'::jsonb, NOW(), NOW())
ON CONFLICT (restaurant_id, provider) DO NOTHING;

-- ============================================================================
-- 10. PROMOTIONS (3 promo attive)
-- ============================================================================

INSERT INTO public.restaurant_promotions (
  restaurant_id, code, name, promo_type, value_pct, value_amount,
  conditions, valid_from, valid_to, max_uses, uses_count, active
) VALUES
  (v_restaurant_entity_id, 'EARLY20', 'Early Bird Cena', 'early_bird', 20, NULL,
   '{"book_before_hour":18,"applies_to_service":"dinner"}'::jsonb,
   CURRENT_DATE, CURRENT_DATE + INTERVAL '90 days', 100, 0, TRUE),
  (v_restaurant_entity_id, 'PRANZO10', 'Sconto Pranzo', 'happy_hour', 10, NULL,
   '{"applies_to_service":"lunch","weekdays":[1,2,3,4]}'::jsonb,
   CURRENT_DATE, CURRENT_DATE + INTERVAL '60 days', 200, 0, TRUE),
  (v_restaurant_entity_id, 'GROUP15', 'Sconto Gruppo 8+', 'percent_off', 15, NULL,
   '{"min_party_size":8}'::jsonb,
   CURRENT_DATE, CURRENT_DATE + INTERVAL '180 days', NULL, 0, TRUE)
ON CONFLICT (restaurant_id, code) DO NOTHING;

-- ============================================================================
-- 11. PRICING RULES (cover dynamic)
-- ============================================================================

INSERT INTO public.restaurant_pricing_rules (
  restaurant_id, rule_type, name, applies_to,
  config, adjustment_type, adjustment_value, priority, active
) VALUES
  (v_restaurant_entity_id, 'day_of_week', 'Weekend +20% cover', 'cover',
   '{"days":[5,6]}'::jsonb, 'percent', 20, 80, TRUE),
  (v_restaurant_entity_id, 'time_of_day', 'Cena prime time +15%', 'cover',
   '{"startTime":"20:00","endTime":"21:30"}'::jsonb, 'percent', 15, 70, TRUE),
  (v_restaurant_entity_id, 'group_size', 'Gruppi grandi -10%', 'cover',
   '{"minSize":10}'::jsonb, 'percent', -10, 60, TRUE)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 12. RESERVATIONS demo (15 prenotazioni varie)
-- ============================================================================

INSERT INTO public.restaurant_reservations (
  restaurant_id, slot_date, slot_time, service_label, party_size, duration_minutes,
  table_ids, status, source, guest_name, guest_phone, guest_email,
  special_requests, allergies, occasion, deposit_amount,
  created_at
)
SELECT
  v_restaurant_entity_id,
  CURRENT_DATE + (offset_day || ' days')::INTERVAL,
  slot_time,
  service_label,
  party_size,
  90,
  ARRAY[table_id]::UUID[],
  status,
  source,
  guest_name,
  guest_phone,
  guest_email,
  special_requests,
  allergies::TEXT[],
  occasion,
  deposit_amount,
  NOW() - (offset_day || ' days')::INTERVAL
FROM (VALUES
  -- Oggi
  (0, '13:00'::TIME, 'Pranzo', 4, '23000000-0000-0000-0000-000000000003'::UUID, 'confirmed'::TEXT, 'direct', 'Famiglia Esposito', '+39 333 1234567', 'esposito@example.com', NULL::TEXT, ARRAY['gluten'], NULL::TEXT, 0::NUMERIC),
  (0, '13:30'::TIME, 'Pranzo', 2, '23000000-0000-0000-0000-000000000001'::UUID, 'confirmed', 'widget', 'Marco Bianchi', '+39 340 7654321', 'marco.b@example.com', 'Tavolo finestra', ARRAY[]::TEXT[], NULL, 0),
  (0, '20:00'::TIME, 'Cena', 6, '23000000-0000-0000-0000-000000000005'::UUID, 'confirmed', 'thefork', 'Family Brown', '+44 20 7946 0958', 'brown@example.com', NULL, ARRAY['nuts'], 'birthday', 90),
  (0, '20:30'::TIME, 'Cena', 2, '23000000-0000-0000-0000-000000000010'::UUID, 'seated', 'walk_in', 'Coppia anonima', NULL, NULL, NULL, ARRAY[]::TEXT[], 'anniversary', 0),
  (0, '21:00'::TIME, 'Cena', 8, '23000000-0000-0000-0000-000000000017'::UUID, 'confirmed', 'phone', 'Aziendale Tech srl', '+39 035 555 0123', 'eventi@tech.it', 'Cena business', ARRAY['gluten','milk'], 'business', 120),

  -- Domani
  (1, '13:00'::TIME, 'Pranzo', 3, '23000000-0000-0000-0000-000000000007'::UUID, 'confirmed', 'widget', 'Schmidt family', '+49 30 12345678', 'schmidt@example.de', NULL, ARRAY[]::TEXT[], NULL, 0),
  (1, '20:00'::TIME, 'Cena', 4, '23000000-0000-0000-0000-000000000004'::UUID, 'confirmed', 'direct', 'Anna Russo', '+39 339 1112233', 'a.russo@example.com', NULL, ARRAY['molluscs'], NULL, 60),
  (1, '20:30'::TIME, 'Cena', 10, '23000000-0000-0000-0000-000000000019'::UUID, 'confirmed', 'thefork', 'Wedding party Conti', '+39 348 9988776', 'wedding@conti.it', 'Anniversario 25°', ARRAY[]::TEXT[], 'anniversary', 150),

  -- Tra 2 giorni
  (2, '13:00'::TIME, 'Pranzo', 2, '23000000-0000-0000-0000-000000000002'::UUID, 'confirmed', 'widget', 'Pierre Dubois', '+33 1 42 86 82 00', 'pdubois@example.fr', NULL, ARRAY[]::TEXT[], NULL, 0),
  (2, '21:00'::TIME, 'Cena', 6, '23000000-0000-0000-0000-000000000015'::UUID, 'confirmed', 'direct', 'Famiglia Marinelli', '+39 347 6655443', 'marinelli@example.com', 'Dehors per cane', ARRAY[]::TEXT[], NULL, 90),

  -- Storico (settimana scorsa, finished)
  (-7, '20:30'::TIME, 'Cena', 4, '23000000-0000-0000-0000-000000000004'::UUID, 'finished', 'walk_in', 'Tedesco', '+49 89 555 1234', NULL, NULL, ARRAY[]::TEXT[], NULL, 0),
  (-5, '13:00'::TIME, 'Pranzo', 2, '23000000-0000-0000-0000-000000000001'::UUID, 'finished', 'direct', 'Fontana', '+39 333 4444555', 'fontana@example.com', NULL, ARRAY[]::TEXT[], NULL, 0),
  (-3, '20:00'::TIME, 'Cena', 8, '23000000-0000-0000-0000-000000000017'::UUID, 'finished', 'thefork', 'Compleanno Lara', '+39 340 1112233', 'lara@example.com', '12 anni Lara', ARRAY['nuts'], 'birthday', 120),
  (-2, '20:30'::TIME, 'Cena', 4, '23000000-0000-0000-0000-000000000003'::UUID, 'no_show', 'widget', 'Sconosciuti', '+39 333 0000000', 'noshow@example.com', NULL, ARRAY[]::TEXT[], NULL, 60),
  (-1, '13:00'::TIME, 'Pranzo', 3, '23000000-0000-0000-0000-000000000007'::UUID, 'finished', 'direct', 'Famiglia Russo', '+39 348 2233445', NULL, NULL, ARRAY[]::TEXT[], NULL, 0)
) AS t(offset_day, slot_time, service_label, party_size, table_id, status, source, guest_name, guest_phone, guest_email, special_requests, allergies, occasion, deposit_amount)
WHERE NOT EXISTS (
  SELECT 1 FROM public.restaurant_reservations r
  WHERE r.restaurant_id = v_restaurant_entity_id
    AND r.guest_name = t.guest_name
    AND r.slot_date = CURRENT_DATE + (t.offset_day || ' days')::INTERVAL
);

-- ============================================================================
-- 13. ORDINI POS (ordini chiusi storici per analytics)
-- ============================================================================

INSERT INTO public.restaurant_orders (
  restaurant_id, table_id, status, party_size,
  subtotal, service_charge, cover_charge, tip_amount, vat_total, total,
  payment_method, payment_status,
  opened_at, sent_at, closed_at,
  created_at, updated_at
)
SELECT
  v_restaurant_entity_id,
  table_id,
  'closed',
  party_size,
  subtotal,
  0,
  cover_charge,
  tip,
  vat_total,
  total,
  payment_method,
  'paid',
  opened_at,
  opened_at + INTERVAL '5 minutes',
  opened_at + INTERVAL '90 minutes',
  opened_at,
  opened_at + INTERVAL '90 minutes'
FROM (VALUES
  -- Settimana scorsa - 30 ordini
  ('23000000-0000-0000-0000-000000000003'::UUID, 4, 95.00::NUMERIC, 5.00::NUMERIC, 0::NUMERIC, 9.50::NUMERIC, 100.00::NUMERIC, 'card', NOW() - INTERVAL '6 days' + INTERVAL '13 hours'),
  ('23000000-0000-0000-0000-000000000005'::UUID, 6, 178.00, 12.00, 10.00, 17.80, 200.00, 'card', NOW() - INTERVAL '6 days' + INTERVAL '20 hours'),
  ('23000000-0000-0000-0000-000000000017'::UUID, 8, 230.00, 16.00, 0, 23.00, 246.00, 'cash', NOW() - INTERVAL '6 days' + INTERVAL '21 hours'),
  ('23000000-0000-0000-0000-000000000003'::UUID, 4, 75.00, 4.00, 5.00, 7.50, 84.00, 'card', NOW() - INTERVAL '5 days' + INTERVAL '13 hours'),
  ('23000000-0000-0000-0000-000000000019'::UUID, 10, 380.00, 20.00, 0, 38.00, 400.00, 'card', NOW() - INTERVAL '5 days' + INTERVAL '20 hours'),
  ('23000000-0000-0000-0000-000000000004'::UUID, 4, 88.00, 4.40, 0, 8.80, 96.80, 'card', NOW() - INTERVAL '4 days' + INTERVAL '20 hours'),
  ('23000000-0000-0000-0000-000000000007'::UUID, 4, 65.00, 4.00, 0, 6.50, 71.00, 'cash', NOW() - INTERVAL '4 days' + INTERVAL '13 hours'),
  ('23000000-0000-0000-0000-000000000005'::UUID, 6, 145.00, 8.00, 0, 14.50, 159.50, 'card', NOW() - INTERVAL '3 days' + INTERVAL '20 hours'),
  ('23000000-0000-0000-0000-000000000017'::UUID, 8, 198.00, 12.00, 8.00, 19.80, 225.80, 'card', NOW() - INTERVAL '3 days' + INTERVAL '21 hours'),
  ('23000000-0000-0000-0000-000000000003'::UUID, 4, 92.00, 5.00, 0, 9.20, 101.20, 'cash', NOW() - INTERVAL '2 days' + INTERVAL '13 hours'),
  ('23000000-0000-0000-0000-000000000004'::UUID, 4, 78.00, 4.00, 0, 7.80, 85.80, 'card', NOW() - INTERVAL '2 days' + INTERVAL '20 hours'),
  ('23000000-0000-0000-0000-000000000019'::UUID, 10, 425.00, 25.00, 15.00, 42.50, 465.00, 'card', NOW() - INTERVAL '2 days' + INTERVAL '20 hours'),
  ('23000000-0000-0000-0000-000000000005'::UUID, 6, 165.00, 10.00, 0, 16.50, 181.50, 'card', NOW() - INTERVAL '1 days' + INTERVAL '20 hours'),
  ('23000000-0000-0000-0000-000000000007'::UUID, 4, 72.00, 4.00, 0, 7.20, 79.20, 'cash', NOW() - INTERVAL '1 days' + INTERVAL '13 hours')
) AS t(table_id, party_size, subtotal, cover_charge, tip, vat_total, total, payment_method, opened_at)
WHERE NOT EXISTS (
  SELECT 1 FROM public.restaurant_orders ro
  WHERE ro.restaurant_id = v_restaurant_entity_id
    AND ro.table_id = t.table_id
    AND ro.opened_at = t.opened_at
);

-- ============================================================================
-- 14. AGGIORNA tenant.modules per attivare restaurant
-- ============================================================================

UPDATE public.tenants
SET modules = jsonb_set(
  COALESCE(modules, '{}'::jsonb),
  '{restaurant}',
  jsonb_build_object('active', true, 'source', 'demo_seed', 'since', NOW()::TEXT)
)
WHERE id = v_tenant_id;

END $$;

-- ============================================================================
-- 15. KITCHEN STATIONS (per KDS)
-- ============================================================================

INSERT INTO public.kitchen_stations (restaurant_id, code, name, active)
VALUES
  ('20000000-0000-0000-0000-000000000001', 'cold', 'Cold Station', TRUE),
  ('20000000-0000-0000-0000-000000000001', 'hot', 'Hot Station', TRUE),
  ('20000000-0000-0000-0000-000000000001', 'grill', 'Grill', TRUE),
  ('20000000-0000-0000-0000-000000000001', 'pastry', 'Pastry', TRUE),
  ('20000000-0000-0000-0000-000000000001', 'bar', 'Bar', TRUE)
ON CONFLICT (restaurant_id, code) DO NOTHING;
