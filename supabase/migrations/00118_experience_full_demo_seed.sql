-- 00118: Demo seed addons + pickup zones + waivers + resources + pricing rules + itinerary + tour multi-day
-- Modulo: Experience M060-M064
-- Dipende da 00109 demo base

DO $$
DECLARE
  v_tenant_id UUID;
  v_ent_motoslitta UUID;
  v_ent_parco UUID;
  v_ent_kayak UUID;
  v_prod_motoslitta UUID;
  v_prod_parco UUID;
  v_prod_kayak UUID;
  v_prod_tour UUID := gen_random_uuid();
  v_ent_tour UUID := gen_random_uuid();
  v_waiver_motoslitta UUID := gen_random_uuid();
  v_waiver_parco UUID := gen_random_uuid();
  v_res_guide1 UUID := gen_random_uuid();
  v_res_guide2 UUID := gen_random_uuid();
  v_res_motoslitta1 UUID := gen_random_uuid();
BEGIN
  SELECT id INTO v_tenant_id FROM public.tenants WHERE slug = 'villa-irabo' LIMIT 1;
  IF v_tenant_id IS NULL THEN RETURN; END IF;

  SELECT id INTO v_ent_motoslitta FROM public.entities WHERE tenant_id = v_tenant_id AND slug = 'motoslitte-livigno-adventure';
  SELECT id INTO v_ent_parco FROM public.entities WHERE tenant_id = v_tenant_id AND slug = 'parco-avventura-garda';
  SELECT id INTO v_ent_kayak FROM public.entities WHERE tenant_id = v_tenant_id AND slug = 'kayak-gardone-rental';

  SELECT id INTO v_prod_motoslitta FROM public.experience_products WHERE entity_id = v_ent_motoslitta AND slug = 'escursione-valle-gallo';
  SELECT id INTO v_prod_parco FROM public.experience_products WHERE entity_id = v_ent_parco AND slug = 'ingresso-giornaliero';
  SELECT id INTO v_prod_kayak FROM public.experience_products WHERE entity_id = v_ent_kayak AND slug = 'kayak-orario-singolo';

  -- ========================================================================
  -- WAIVERS
  -- ========================================================================
  IF v_ent_motoslitta IS NOT NULL THEN
    INSERT INTO public.experience_waivers (id, entity_id, tenant_id, title, body_md, version, language, active) VALUES
    (v_waiver_motoslitta, v_ent_motoslitta, v_tenant_id, 'Manleva Escursione Motoslitta',
     '# Manleva Responsabilità\n\nIl sottoscritto dichiara di:\n- Essere in buone condizioni fisiche\n- Non essere in stato di gravidanza\n- Non essere sotto effetto di alcool/stupefacenti\n- Possedere patente B valida\n- Accettare rischi intrinseci attività\n\nL''organizzatore declina ogni responsabilità per incidenti dovuti a negligenza del partecipante.',
     1, 'it', TRUE);
  END IF;

  IF v_ent_parco IS NOT NULL THEN
    INSERT INTO public.experience_waivers (id, entity_id, tenant_id, title, body_md, version, language, requires_parent_for_minor, active) VALUES
    (v_waiver_parco, v_ent_parco, v_tenant_id, 'Manleva Parco Avventura',
     '# Manleva Parco Avventura\n\nI percorsi in altezza comportano rischi. Il partecipante:\n- Ha età min 6 anni e altezza min 110cm\n- Non soffre di vertigini o patologie cardiache\n- Seguirà le istruzioni dello staff\n- Useràcorretamente l''attrezzatura fornita\n\nPer minori: firma genitore/tutore obbligatoria.',
     1, 'it', TRUE, TRUE);
  END IF;

  -- ========================================================================
  -- ADDONS
  -- ========================================================================
  IF v_prod_motoslitta IS NOT NULL THEN
    INSERT INTO public.experience_addons (product_id, tenant_id, code, name, description, kind, price_cents, price_per, display_order, active) VALUES
    (v_prod_motoslitta, v_tenant_id, 'photo_pack', 'Pacchetto foto professionali', '20+ foto HD action scattate dalla guida', 'media', 2500, 'booking', 1, TRUE),
    (v_prod_motoslitta, v_tenant_id, 'gopro', 'Noleggio GoPro', 'GoPro Hero 12 + casco mount + scheda 64GB', 'media', 1500, 'booking', 2, TRUE),
    (v_prod_motoslitta, v_tenant_id, 'insurance_premium', 'Assicurazione premium', 'Copertura danni mezzo fino €3000', 'insurance', 1000, 'booking', 3, TRUE),
    (v_prod_motoslitta, v_tenant_id, 'hotel_pickup', 'Pickup hotel', 'Transfer A/R dal tuo hotel Livigno', 'transport', 1500, 'booking', 4, TRUE),
    (v_prod_motoslitta, v_tenant_id, 'hot_chocolate', 'Cioccolata calda al rifugio', 'Pausa golosa al rifugio di media quota', 'food', 500, 'guest', 5, TRUE);
  END IF;

  IF v_prod_parco IS NOT NULL THEN
    INSERT INTO public.experience_addons (product_id, tenant_id, code, name, description, kind, price_cents, price_per, display_order, active) VALUES
    (v_prod_parco, v_tenant_id, 'pic_nic', 'Cestino pic-nic', 'Panino + frutta + bevanda', 'food', 1200, 'guest', 1, TRUE),
    (v_prod_parco, v_tenant_id, 'tshirt', 'T-shirt souvenir', 'Logo parco, cotone biologico', 'other', 1500, 'unit', 2, TRUE);
  END IF;

  IF v_prod_kayak IS NOT NULL THEN
    INSERT INTO public.experience_addons (product_id, tenant_id, code, name, description, kind, price_cents, price_per, display_order, active) VALUES
    (v_prod_kayak, v_tenant_id, 'dry_bag', 'Sacca stagna 20L', 'Per smartphone e effetti personali', 'gear', 500, 'booking', 1, TRUE),
    (v_prod_kayak, v_tenant_id, 'water_shoes', 'Scarpe acqua', 'Taglia a scelta', 'gear', 300, 'guest', 2, TRUE),
    (v_prod_kayak, v_tenant_id, 'delivery', 'Consegna oltre 5km', 'Delivery fuori zona gratuita', 'transport', 2000, 'booking', 3, TRUE);
  END IF;

  -- ========================================================================
  -- PICKUP ZONES
  -- ========================================================================
  IF v_ent_motoslitta IS NOT NULL THEN
    INSERT INTO public.experience_pickup_zones (entity_id, tenant_id, name, radius_km, surcharge_cents, active, display_order) VALUES
    (v_ent_motoslitta, v_tenant_id, 'Livigno centro (gratis)', 3.0, 0, TRUE, 1),
    (v_ent_motoslitta, v_tenant_id, 'Trepalle', 8.0, 1500, TRUE, 2),
    (v_ent_motoslitta, v_tenant_id, 'Passo Foscagno', 15.0, 2500, TRUE, 3);
  END IF;

  IF v_ent_kayak IS NOT NULL THEN
    INSERT INTO public.experience_pickup_zones (entity_id, tenant_id, name, radius_km, surcharge_cents, active, display_order) VALUES
    (v_ent_kayak, v_tenant_id, 'Gardone+Salò+Maderno (gratis)', 5.0, 0, TRUE, 1),
    (v_ent_kayak, v_tenant_id, 'Desenzano+Sirmione', 15.0, 1500, TRUE, 2),
    (v_ent_kayak, v_tenant_id, 'Limone sul Garda', 25.0, 2500, TRUE, 3);
  END IF;

  -- ========================================================================
  -- RESOURCES (guides + vehicles)
  -- ========================================================================
  IF v_ent_motoslitta IS NOT NULL THEN
    INSERT INTO public.experience_resources (id, entity_id, tenant_id, kind, name, code, capacity, skills, languages, active) VALUES
    (v_res_guide1, v_ent_motoslitta, v_tenant_id, 'guide', 'Marco Bianchi', 'G001', 1, ARRAY['motoslitta','valanghe','primo_soccorso'], ARRAY['it','en','de'], TRUE),
    (v_res_guide2, v_ent_motoslitta, v_tenant_id, 'guide', 'Lisa Meier', 'G002', 1, ARRAY['motoslitta','primo_soccorso'], ARRAY['it','en','de'], TRUE),
    (v_res_motoslitta1, v_ent_motoslitta, v_tenant_id, 'vehicle', 'Ski-Doo Renegade #1', 'SKIDOO-001', 2, ARRAY['2up','600cc'], ARRAY[]::TEXT[], TRUE);

    INSERT INTO public.experience_resources (entity_id, tenant_id, kind, name, capacity, active) VALUES
    (v_ent_motoslitta, v_tenant_id, 'vehicle', 'Ski-Doo Renegade #2', 2, TRUE),
    (v_ent_motoslitta, v_tenant_id, 'vehicle', 'Ski-Doo Renegade #3', 2, TRUE),
    (v_ent_motoslitta, v_tenant_id, 'vehicle', 'Ski-Doo Renegade #4', 2, TRUE),
    (v_ent_motoslitta, v_tenant_id, 'vehicle', 'Ski-Doo Renegade #5', 2, TRUE);

    -- Assignment guide + vehicle al prodotto
    INSERT INTO public.experience_resource_assignments (product_id, resource_id, tenant_id, required, quantity) VALUES
    (v_prod_motoslitta, v_res_guide1, v_tenant_id, TRUE, 1),
    (v_prod_motoslitta, v_res_motoslitta1, v_tenant_id, TRUE, 1);
  END IF;

  -- ========================================================================
  -- PRICING RULES dynamic
  -- ========================================================================
  IF v_prod_motoslitta IS NOT NULL THEN
    INSERT INTO public.experience_pricing_rules (product_id, tenant_id, name, kind, priority, conditions, adjustment_type, adjustment_value, valid_from, valid_to, active) VALUES
    (v_prod_motoslitta, v_tenant_id, 'Alta stagione Natale/Capodanno', 'season', 10,
     '{"date_from":"2026-12-20","date_to":"2027-01-06"}'::jsonb, 'percent', 25, '2026-12-20', '2027-01-06', TRUE),
    (v_prod_motoslitta, v_tenant_id, 'Last minute -15% < 24h', 'last_minute', 5,
     '{"hours_before":24}'::jsonb, 'percent', -15, NULL, NULL, TRUE),
    (v_prod_motoslitta, v_tenant_id, 'Sconto gruppo 6+', 'group_discount', 5,
     '{"min_guests":6}'::jsonb, 'percent', -10, NULL, NULL, TRUE);
  END IF;

  IF v_prod_parco IS NOT NULL THEN
    INSERT INTO public.experience_pricing_rules (product_id, tenant_id, name, kind, priority, conditions, adjustment_type, adjustment_value, active) VALUES
    (v_prod_parco, v_tenant_id, 'Sconto famiglia 4+', 'group_discount', 5, '{"min_guests":4}'::jsonb, 'percent', -15, TRUE),
    (v_prod_parco, v_tenant_id, 'Early bird 7gg prima', 'early_bird', 10, '{"days_before":7}'::jsonb, 'percent', -10, TRUE);
  END IF;

  -- ========================================================================
  -- MULTI-DAY TOUR
  -- ========================================================================
  INSERT INTO public.entities (id, tenant_id, kind, slug, name, description, short_description, management_mode, is_active)
  VALUES (v_ent_tour, v_tenant_id, 'activity', 'tour-dolomiti-3-giorni',
    'Tour Dolomiti 3 Giorni', 'Tour guidato di 3 giorni nelle Dolomiti: Cortina, Tre Cime di Lavaredo, Alta Badia.',
    '3 giorni trekking Dolomiti con guida alpina', 'self_service', TRUE)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.experience_entities (id, tenant_id, category, city, country, latitude, longitude, languages, age_min_default, difficulty_default, opening_hours, cancellation_policy)
  VALUES (v_ent_tour, v_tenant_id, 'guided_tour', 'Cortina d''Ampezzo', 'IT', 46.5405, 12.1357,
    ARRAY['it','en','de'], 16, 'medium',
    '{"mon":["08:00-20:00"],"tue":["08:00-20:00"],"wed":["08:00-20:00"],"thu":["08:00-20:00"],"fri":["08:00-20:00"],"sat":["08:00-20:00"],"sun":["08:00-20:00"]}'::jsonb,
    '{"full_refund_hours_before":168,"partial_refund_hours_before":72,"partial_percent":50}'::jsonb);

  INSERT INTO public.experience_products (id, entity_id, tenant_id, slug, name, description_md, booking_mode, duration_minutes, capacity_default, age_min, difficulty, languages, price_base_cents, vat_rate, highlights, includes, excludes, requirements, meeting_point, cutoff_minutes, status, days_count, tour_type)
  VALUES (v_prod_tour, v_ent_tour, v_tenant_id, 'tour-dolomiti-classico',
    'Tour Dolomiti Classico 3 Giorni',
    '## 3 giorni nelle Dolomiti UNESCO\n\nDay 1: Cortina → Lago di Braies → Tre Cime di Lavaredo\nDay 2: Alta Badia → Piz Boè → Passo Falzarego\nDay 3: Marmolada → Cinque Torri → rientro',
    'timeslot_capacity', 4320, 12, 16, 'medium', ARRAY['it','en','de'],
    48000, 22.00,
    ARRAY['Guida alpina UIAGM','Tre Cime UNESCO','Piz Boè 3152m','Cibo locale ladino','Rifugi di montagna'],
    ARRAY['Guida','Transfer privato','2 notti rifugio','Pranzi tipici','Assicurazione'],
    ARRAY['Attrezzatura tecnica','Bevande','Cena serata libera'],
    'Esperienza trekking intermedia richiesta. Patente B utile.',
    'Cortina d''Ampezzo, Piazza Venezia', 4320, 'active', 3, 'multi_day');

  -- Itinerary steps 3 days
  INSERT INTO public.experience_itinerary_steps (product_id, tenant_id, step_number, day_number, start_offset_minutes, duration_minutes, title, description_md, location_name, latitude, longitude, step_type) VALUES
  (v_prod_tour, v_tenant_id, 1, 1, 0, 30, 'Meeting point Cortina', 'Incontro con guida e gruppo', 'Piazza Venezia, Cortina', 46.5405, 12.1357, 'meeting'),
  (v_prod_tour, v_tenant_id, 2, 1, 30, 90, 'Transfer Lago di Braies', 'Viaggio scenic verso Lago di Braies', 'Lago di Braies', 46.6944, 12.0852, 'transfer'),
  (v_prod_tour, v_tenant_id, 3, 1, 120, 240, 'Trekking Lago di Braies', 'Anello completo del lago + fotografia', 'Lago di Braies', 46.6944, 12.0852, 'activity'),
  (v_prod_tour, v_tenant_id, 4, 1, 360, 60, 'Pranzo al rifugio', 'Pranzo tipico ladino', 'Rifugio Braies', 46.6944, 12.0852, 'meal'),
  (v_prod_tour, v_tenant_id, 5, 1, 420, 180, 'Tre Cime di Lavaredo', 'Giro delle Tre Cime, panorama UNESCO', 'Rifugio Auronzo', 46.6179, 12.2958, 'activity'),
  (v_prod_tour, v_tenant_id, 6, 1, 600, NULL, 'Arrivo Rifugio Auronzo', 'Cena + pernottamento', 'Rifugio Auronzo', 46.6179, 12.2958, 'accommodation'),
  (v_prod_tour, v_tenant_id, 7, 2, 0, 60, 'Colazione + transfer Alta Badia', 'Partenza per Alta Badia', 'Rifugio Auronzo', 46.6179, 12.2958, 'transfer'),
  (v_prod_tour, v_tenant_id, 8, 2, 60, 420, 'Piz Boè ascent 3152m', 'Salita al Piz Boè tramite sentiero classico', 'Piz Boè', 46.5098, 11.8352, 'activity'),
  (v_prod_tour, v_tenant_id, 9, 2, 540, 120, 'Discesa + Passo Falzarego', 'Discesa verso Passo Falzarego', 'Passo Falzarego', 46.5214, 12.0092, 'break'),
  (v_prod_tour, v_tenant_id, 10, 2, 660, NULL, 'Rifugio Alta Badia', 'Seconda notte in rifugio', 'Alta Badia', 46.5620, 11.8930, 'accommodation'),
  (v_prod_tour, v_tenant_id, 11, 3, 0, 60, 'Transfer Marmolada', 'Verso regina delle Dolomiti', 'Marmolada', 46.4335, 11.8711, 'transfer'),
  (v_prod_tour, v_tenant_id, 12, 3, 60, 300, 'Marmolada + Cinque Torri', 'Cabinovia Marmolada + trek Cinque Torri', 'Cinque Torri', 46.5317, 12.0453, 'activity'),
  (v_prod_tour, v_tenant_id, 13, 3, 360, 60, 'Pranzo finale', 'Pranzo di gruppo celebrativo', 'Rifugio Cinque Torri', 46.5317, 12.0453, 'meal'),
  (v_prod_tour, v_tenant_id, 14, 3, 420, 120, 'Rientro Cortina', 'Transfer rientro + fine tour', 'Piazza Venezia, Cortina', 46.5405, 12.1357, 'dropoff');

  INSERT INTO public.experience_variants (product_id, tenant_id, code, label, kind, price_cents, min_qty, max_qty, includes_capacity, display_order, active) VALUES
  (v_prod_tour, v_tenant_id, 'adult', 'Adulto', 'adult', 48000, 1, 12, 1, 1, TRUE),
  (v_prod_tour, v_tenant_id, 'student', 'Studente', 'student', 42000, 0, 12, 1, 2, TRUE);

  -- Schedule weekly tour partenze lun/gio
  INSERT INTO public.experience_schedules (product_id, tenant_id, name, weekly_rules, valid_from, timezone, active) VALUES
  (v_prod_tour, v_tenant_id, 'Partenze lun+gio estate 2026',
   '[{"dow":1,"slots":[{"start":"08:00","capacity":12}]},{"dow":4,"slots":[{"start":"08:00","capacity":12}]}]'::jsonb,
   '2026-05-01', 'Europe/Rome', TRUE);

  RAISE NOTICE 'Experience full demo seed complete: tour multi-day, waivers, addons, pickup zones, resources, pricing rules, itinerary';
END $$;
