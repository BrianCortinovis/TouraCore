-- 00109: Demo seed 3 Experience (motoslitta Livigno + parco avventura + noleggio kayak)
-- Dipende da: 00104-00108 + tenant villa-irabo esistente
-- Modulo: Experience M051/S01

DO $$
DECLARE
  v_tenant_id UUID;
  v_ent_motoslitta UUID := gen_random_uuid();
  v_ent_parco UUID := gen_random_uuid();
  v_ent_kayak UUID := gen_random_uuid();
  v_prod_motoslitta UUID := gen_random_uuid();
  v_prod_parco UUID := gen_random_uuid();
  v_prod_kayak UUID := gen_random_uuid();
  v_sched_motoslitta UUID := gen_random_uuid();
  v_sched_parco UUID := gen_random_uuid();
  v_sched_kayak UUID := gen_random_uuid();
BEGIN
  SELECT id INTO v_tenant_id FROM public.tenants WHERE slug = 'villa-irabo' LIMIT 1;
  IF v_tenant_id IS NULL THEN
    RAISE NOTICE 'Tenant villa-irabo not found, skipping experience seed';
    RETURN;
  END IF;

  -- ==========================================================================
  -- 1. MOTOSLITTA LIVIGNO (timeslot_capacity — 5 posti/slot)
  -- ==========================================================================
  INSERT INTO public.entities (id, tenant_id, kind, slug, name, description, short_description, management_mode, is_active)
  VALUES (
    v_ent_motoslitta, v_tenant_id, 'activity', 'motoslitte-livigno-adventure',
    'Motoslitte Livigno Adventure',
    'Escursioni guidate in motoslitta sulla Valle del Gallo, Livigno. Guida esperta inclusa, mezzi ultimo modello. Adatto principianti ed esperti.',
    'Escursioni motoslitta Livigno, guida + mezzo inclusi',
    'self_service', TRUE
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.experience_entities (
    id, tenant_id, category, address, city, zip, country, latitude, longitude,
    languages, age_min_default, difficulty_default,
    opening_hours, waiver_policy, cancellation_policy, pickup_config
  ) VALUES (
    v_ent_motoslitta, v_tenant_id, 'snow_sport',
    'Via Pontiglia 12', 'Livigno', '23041', 'IT', 46.5383, 10.1350,
    ARRAY['it','en','de'], 16, 'medium',
    '{"mon":["09:00-20:00"],"tue":["09:00-20:00"],"wed":["09:00-20:00"],"thu":["09:00-20:00"],"fri":["09:00-21:00"],"sat":["08:30-21:00"],"sun":["08:30-21:00"]}'::jsonb,
    '{"required":true,"template_version":1,"blocks_booking":true}'::jsonb,
    '{"full_refund_hours_before":48,"partial_refund_hours_before":24,"partial_percent":50}'::jsonb,
    '{"hotel_pickup":true,"pickup_radius_km":5,"pickup_fee_cents":0}'::jsonb
  );

  INSERT INTO public.experience_products (
    id, entity_id, tenant_id, slug, name, description_md, booking_mode,
    duration_minutes, capacity_default, age_min, difficulty, languages,
    price_base_cents, vat_rate, highlights, includes, excludes, requirements,
    meeting_point, waiver_required, deposit_required_cents, cutoff_minutes, status
  ) VALUES (
    v_prod_motoslitta, v_ent_motoslitta, v_tenant_id, 'escursione-valle-gallo',
    'Escursione Motoslitta Valle del Gallo (2h)',
    '## Escursione Valle del Gallo\n\nPartenza da Livigno centro, scenic route di 2 ore con guida alpina certificata. Include motoslitta Ski-Doo Renegade, casco, vestiario termico.',
    'timeslot_capacity',
    120, 5, 16, 'medium', ARRAY['it','en','de'],
    8900, 22.00,
    ARRAY['Valle panoramica 2000m','Guida alpina certificata','Ski-Doo Renegade ultimo modello','Pausa cioccolata calda'],
    ARRAY['Motoslitta','Casco','Vestiario termico','Guida','Assicurazione base'],
    ARRAY['Foto/video','Pickup hotel','Pranzo'],
    'Patente B necessaria. Età min 16 anni. Peso max 120kg. No stato di gravidanza.',
    'Ufficio Via Pontiglia 12, Livigno',
    TRUE, 2000, 180, 'active'
  );

  INSERT INTO public.experience_variants (product_id, tenant_id, code, label, kind, price_cents, price_diff_cents, min_qty, max_qty, includes_capacity, display_order, active) VALUES
    (v_prod_motoslitta, v_tenant_id, 'adult', 'Adulto guida (16+)', 'adult', 8900, 0, 1, 5, 1, 1, TRUE),
    (v_prod_motoslitta, v_tenant_id, 'passenger', 'Passeggero (condivide mezzo)', 'other', 4500, -4400, 0, 5, 1, 2, TRUE);

  INSERT INTO public.experience_schedules (id, product_id, tenant_id, name, weekly_rules, valid_from, timezone, active) VALUES
    (v_sched_motoslitta, v_prod_motoslitta, v_tenant_id, 'Stagione invernale 2026',
     '[{"dow":1,"slots":[{"start":"10:00","capacity":5},{"start":"14:00","capacity":5},{"start":"16:30","capacity":5}]},{"dow":2,"slots":[{"start":"10:00","capacity":5},{"start":"14:00","capacity":5},{"start":"16:30","capacity":5}]},{"dow":3,"slots":[{"start":"10:00","capacity":5},{"start":"14:00","capacity":5},{"start":"16:30","capacity":5}]},{"dow":4,"slots":[{"start":"10:00","capacity":5},{"start":"14:00","capacity":5},{"start":"16:30","capacity":5}]},{"dow":5,"slots":[{"start":"10:00","capacity":5},{"start":"14:00","capacity":5},{"start":"16:30","capacity":5},{"start":"19:00","capacity":5}]},{"dow":6,"slots":[{"start":"09:00","capacity":5},{"start":"11:00","capacity":5},{"start":"14:00","capacity":5},{"start":"16:30","capacity":5},{"start":"19:00","capacity":5}]},{"dow":0,"slots":[{"start":"09:00","capacity":5},{"start":"11:00","capacity":5},{"start":"14:00","capacity":5},{"start":"16:30","capacity":5}]}]'::jsonb,
     '2026-04-18', 'Europe/Rome', TRUE);

  -- Genera 7 giorni di timeslot demo a partire da domani
  INSERT INTO public.experience_timeslots (product_id, schedule_id, tenant_id, start_at, end_at, capacity_total, status)
  SELECT
    v_prod_motoslitta, v_sched_motoslitta, v_tenant_id,
    (CURRENT_DATE + d::INT + '10:00'::TIME)::TIMESTAMPTZ,
    (CURRENT_DATE + d::INT + '10:00'::TIME)::TIMESTAMPTZ + INTERVAL '120 minutes',
    5, 'open'
  FROM generate_series(1, 7) d
  ON CONFLICT (product_id, start_at) DO NOTHING;

  -- ==========================================================================
  -- 2. PARCO AVVENTURA LAGO DI GARDA (timeslot_capacity — 30 posti, waiver, età/altezza min)
  -- ==========================================================================
  INSERT INTO public.entities (id, tenant_id, kind, slug, name, description, short_description, management_mode, is_active)
  VALUES (
    v_ent_parco, v_tenant_id, 'activity', 'parco-avventura-garda',
    'Parco Avventura Lago di Garda',
    'Parco avventura con 5 percorsi aerei tra gli alberi. Dai piccoli ai più esperti. Attrezzatura e caschi inclusi.',
    'Parco avventura 5 percorsi tree-climbing Gardone Riviera',
    'self_service', TRUE
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.experience_entities (
    id, tenant_id, category, address, city, zip, country, latitude, longitude,
    languages, age_min_default, height_min_cm_default, difficulty_default,
    opening_hours, waiver_policy, cancellation_policy
  ) VALUES (
    v_ent_parco, v_tenant_id, 'adventure_park',
    'Via San Michele 15', 'Gardone Riviera', '25083', 'IT', 45.6280, 10.5720,
    ARRAY['it','en','de'], 6, 110, 'easy',
    '{"mon":["09:00-18:00"],"tue":["09:00-18:00"],"wed":["09:00-18:00"],"thu":["09:00-18:00"],"fri":["09:00-18:00"],"sat":["09:00-19:00"],"sun":["09:00-19:00"]}'::jsonb,
    '{"required":true,"template_version":1,"blocks_booking":true}'::jsonb,
    '{"full_refund_hours_before":24,"partial_refund_hours_before":12,"partial_percent":50}'::jsonb
  );

  INSERT INTO public.experience_products (
    id, entity_id, tenant_id, slug, name, description_md, booking_mode,
    duration_minutes, capacity_default, age_min, height_min_cm, difficulty, languages,
    price_base_cents, vat_rate, highlights, includes, excludes, requirements,
    meeting_point, waiver_required, cutoff_minutes, status
  ) VALUES (
    v_prod_parco, v_ent_parco, v_tenant_id, 'ingresso-giornaliero',
    'Ingresso giornaliero Parco Avventura',
    '## 5 percorsi tra gli alberi\n\nDai percorsi baby (bambini 3+) ai percorsi black (adulti esperti). Attrezzatura omologata UIAA, caschi inclusi. Istruttori sempre presenti.',
    'timeslot_capacity',
    180, 30, 6, 110, 'easy', ARRAY['it','en','de'],
    2500, 22.00,
    ARRAY['5 percorsi difficoltà crescente','Attrezzatura UIAA inclusa','Istruttori certificati','Area pic-nic'],
    ARRAY['Attrezzatura','Casco','Istruttori','Assicurazione'],
    ARRAY['Scarpe chiuse (portare proprie)'],
    'Altezza min 110cm. Età min 6 anni. Peso max 120kg.',
    'Biglietteria Parco',
    TRUE, 60, 'active'
  );

  INSERT INTO public.experience_variants (product_id, tenant_id, code, label, kind, price_cents, min_qty, max_qty, includes_capacity, display_order, active) VALUES
    (v_prod_parco, v_tenant_id, 'adult', 'Adulto (18+)', 'adult', 2500, 0, 10, 1, 1, TRUE),
    (v_prod_parco, v_tenant_id, 'child', 'Bambino (6-17)', 'child', 1800, 0, 10, 1, 2, TRUE),
    (v_prod_parco, v_tenant_id, 'family', 'Famiglia (2 adulti + 2 bambini)', 'family', 7500, 0, 3, 4, 3, TRUE);

  INSERT INTO public.experience_schedules (id, product_id, tenant_id, name, weekly_rules, valid_from, timezone, active) VALUES
    (v_sched_parco, v_prod_parco, v_tenant_id, 'Apertura stagionale',
     '[{"dow":1,"slots":[{"start":"09:30","capacity":30},{"start":"13:30","capacity":30}]},{"dow":2,"slots":[{"start":"09:30","capacity":30},{"start":"13:30","capacity":30}]},{"dow":3,"slots":[{"start":"09:30","capacity":30},{"start":"13:30","capacity":30}]},{"dow":4,"slots":[{"start":"09:30","capacity":30},{"start":"13:30","capacity":30}]},{"dow":5,"slots":[{"start":"09:30","capacity":30},{"start":"13:30","capacity":30}]},{"dow":6,"slots":[{"start":"09:30","capacity":30},{"start":"13:30","capacity":30}]},{"dow":0,"slots":[{"start":"09:30","capacity":30},{"start":"13:30","capacity":30}]}]'::jsonb,
     '2026-04-18', 'Europe/Rome', TRUE);

  INSERT INTO public.experience_timeslots (product_id, schedule_id, tenant_id, start_at, end_at, capacity_total, status)
  SELECT
    v_prod_parco, v_sched_parco, v_tenant_id,
    (CURRENT_DATE + d::INT + '09:30'::TIME)::TIMESTAMPTZ,
    (CURRENT_DATE + d::INT + '09:30'::TIME)::TIMESTAMPTZ + INTERVAL '180 minutes',
    30, 'open'
  FROM generate_series(1, 7) d
  ON CONFLICT (product_id, start_at) DO NOTHING;

  -- ==========================================================================
  -- 3. NOLEGGIO KAYAK GARDONE (asset_rental — pool 15 kayak)
  -- ==========================================================================
  INSERT INTO public.entities (id, tenant_id, kind, slug, name, description, short_description, management_mode, is_active)
  VALUES (
    v_ent_kayak, v_tenant_id, 'activity', 'kayak-gardone-rental',
    'Noleggio Kayak Gardone',
    'Noleggio kayak singoli e doppi sul lago di Garda. Partenza da Gardone Riviera, zona delivery gratuita fino 5km.',
    'Kayak singolo/doppio noleggio orario Gardone Riviera',
    'self_service', TRUE
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.experience_entities (
    id, tenant_id, category, address, city, zip, country, latitude, longitude,
    languages, age_min_default, difficulty_default,
    opening_hours, waiver_policy, cancellation_policy, deposit_policy, pickup_config
  ) VALUES (
    v_ent_kayak, v_tenant_id, 'rental_gear',
    'Lungolago Zanardelli 85', 'Gardone Riviera', '25083', 'IT', 45.6246, 10.5672,
    ARRAY['it','en','de'], 12, 'easy',
    '{"mon":["09:00-19:00"],"tue":["09:00-19:00"],"wed":["09:00-19:00"],"thu":["09:00-19:00"],"fri":["09:00-19:00"],"sat":["08:30-20:00"],"sun":["08:30-20:00"]}'::jsonb,
    '{"required":true,"template_version":1,"blocks_booking":false}'::jsonb,
    '{"full_refund_hours_before":4,"partial_refund_hours_before":2,"partial_percent":50}'::jsonb,
    '{"required":true,"amount_cents":5000,"on":"pickup"}'::jsonb,
    '{"hotel_pickup":true,"pickup_radius_km":5,"pickup_fee_cents":500}'::jsonb
  );

  INSERT INTO public.experience_products (
    id, entity_id, tenant_id, slug, name, description_md, booking_mode,
    duration_minutes, capacity_default, age_min, difficulty, languages,
    price_base_cents, vat_rate, highlights, includes, excludes,
    meeting_point, waiver_required, deposit_required_cents, cutoff_minutes, status
  ) VALUES (
    v_prod_kayak, v_ent_kayak, v_tenant_id, 'kayak-orario-singolo',
    'Kayak singolo — noleggio orario',
    '## Noleggio kayak singolo\n\nKayak sit-on-top stabile, adatto principianti. Include giubbotto salvagente, pagaia, mappa zona. Delivery gratuita entro 5km.',
    'asset_rental',
    60, 15, 12, 'easy', ARRAY['it','en','de'],
    1500, 22.00,
    ARRAY['Kayak stabile principianti','Giubbotto + pagaia','Mappa zona','Delivery entro 5km'],
    ARRAY['Kayak','Giubbotto','Pagaia','Mappa'],
    ARRAY['Bombola stagna','Scarpe acqua'],
    'Base Lungolago Zanardelli 85',
    TRUE, 5000, 30, 'active'
  );

  INSERT INTO public.experience_variants (product_id, tenant_id, code, label, kind, price_cents, min_qty, max_qty, includes_capacity, display_order, active) VALUES
    (v_prod_kayak, v_tenant_id, 'hour_1', '1 ora', 'other', 1500, 1, 10, 1, 1, TRUE),
    (v_prod_kayak, v_tenant_id, 'hour_2', '2 ore', 'other', 2500, 1, 10, 1, 2, TRUE),
    (v_prod_kayak, v_tenant_id, 'half_day', 'Mezza giornata (4h)', 'other', 4500, 1, 10, 1, 3, TRUE),
    (v_prod_kayak, v_tenant_id, 'full_day', 'Giornata (8h)', 'other', 7500, 1, 10, 1, 4, TRUE);

  -- Asset rental schedule = opening hours bulk (no timeslot discreti, pool shared)
  INSERT INTO public.experience_schedules (id, product_id, tenant_id, name, weekly_rules, valid_from, timezone, active) VALUES
    (v_sched_kayak, v_prod_kayak, v_tenant_id, 'Pool orario aperto',
     '[{"dow":1,"slots":[{"start":"09:00","capacity":15}]},{"dow":2,"slots":[{"start":"09:00","capacity":15}]},{"dow":3,"slots":[{"start":"09:00","capacity":15}]},{"dow":4,"slots":[{"start":"09:00","capacity":15}]},{"dow":5,"slots":[{"start":"09:00","capacity":15}]},{"dow":6,"slots":[{"start":"08:30","capacity":15}]},{"dow":0,"slots":[{"start":"08:30","capacity":15}]}]'::jsonb,
     '2026-04-18', 'Europe/Rome', TRUE);

  -- 7 giorni pool 15 unit disponibili 9-19
  INSERT INTO public.experience_timeslots (product_id, schedule_id, tenant_id, start_at, end_at, capacity_total, status)
  SELECT
    v_prod_kayak, v_sched_kayak, v_tenant_id,
    (CURRENT_DATE + d::INT + '09:00'::TIME)::TIMESTAMPTZ,
    (CURRENT_DATE + d::INT + '19:00'::TIME)::TIMESTAMPTZ,
    15, 'open'
  FROM generate_series(1, 7) d
  ON CONFLICT (product_id, start_at) DO NOTHING;

  RAISE NOTICE 'Experience demo seed complete: motoslitta_livigno (%) parco_avventura (%) kayak_gardone (%)', v_prod_motoslitta, v_prod_parco, v_prod_kayak;
END $$;
