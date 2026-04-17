-- Demo seed STRUCTURES: 7 entities, una per property_type
-- Ogni struttura: accommodation fiscale completa + room_types + rooms + seasons + rate_plans + rate_prices + upsell + tasse

DO $$
DECLARE
  v_tenant_id uuid := '89147f14-711e-4195-8e82-dd54f24e9457';

  -- Entity IDs fissi (deterministici per re-run)
  e_hotel uuid := '10000000-0000-0000-0000-000000000001';
  e_residence uuid := '10000000-0000-0000-0000-000000000002';
  e_mixed uuid := '10000000-0000-0000-0000-000000000003';
  e_bnb uuid := '10000000-0000-0000-0000-000000000004';
  e_casa uuid := '10000000-0000-0000-0000-000000000005';
  e_affitta uuid := '10000000-0000-0000-0000-000000000006';
  e_agri uuid := '10000000-0000-0000-0000-000000000007';
BEGIN
  -- =========================================================================
  -- ENTITIES + ACCOMMODATIONS
  -- =========================================================================

  -- 1. HOTEL "Grand Hotel Adriatico" (Rimini, 4*)
  INSERT INTO entities (id, tenant_id, kind, slug, name, description, short_description, is_active, management_mode)
  VALUES (e_hotel, v_tenant_id, 'accommodation', 'grand-hotel-adriatico',
    'Grand Hotel Adriatico',
    'demo_seed_v1 | Hotel 4 stelle sul lungomare di Rimini, 40 camere, ristorante, spa.',
    'Hotel 4* Rimini', true, 'self_service');

  INSERT INTO accommodations (
    entity_id, property_type, is_imprenditoriale,
    legal_name, vat_number, fiscal_code, rea_number, legal_details,
    address, city, province, zip, country, region,
    email, phone, pec, website,
    default_check_in_time, default_check_out_time, default_currency, default_language, default_vat_rate, timezone,
    fiscal_regime, has_vat,
    cedolare_secca_enabled, cedolare_secca_rate, ritenuta_ota_enabled, ritenuta_ota_rate,
    cin_code, cin_expiry, scia_number, scia_status, scia_expiry,
    istat_structure_code, sdi_code, invoice_prefix, invoice_next_number,
    star_rating,
    pet_policy, cancellation_policy, payment_methods,
    tourist_tax_enabled, tourist_tax_max_nights, tourist_tax_municipality,
    smoking_allowed, children_allowed, parties_allowed, self_checkin_enabled,
    amenities, settings
  ) VALUES (
    e_hotel, 'hotel', true,
    'Adriatico Hospitality SRL', 'IT03456789012', 'DRTCPL80A01H294K', 'RN-123456',
    '{"type":"srl","capital":50000}'::jsonb,
    'Viale Amerigo Vespucci 14', 'Rimini', 'RN', '47921', 'IT', 'Emilia-Romagna',
    'info@grandhoteladriatico.it', '+39 0541 123456', 'adriatico@pec.it', 'https://grandhoteladriatico.it',
    '15:00', '11:00', 'EUR', 'it', 10, 'Europe/Rome',
    'ordinario', true,
    false, 0, false, 0,
    'IT099014CNI12345', '2030-12-31', 'SCIA-RN-2023-0456', 'approved', '2028-12-31',
    '099014001', 'ABC1234', 'GHA-2026', 1,
    4,
    '{"allowed":true,"fee_per_night":15,"max_pets":1,"size_limit_kg":20}'::jsonb,
    '{"type":"flexible","free_cancellation_days":7,"penalty_pct":50}'::jsonb,
    '["card","bank_transfer","cash"]'::jsonb,
    true, 7, 'Rimini',
    false, true, false, false,
    '["wifi","pool","spa","restaurant","bar","parking","gym","concierge","room_service","air_conditioning"]'::jsonb,
    '{"breakfast_included":true,"restaurant_open":true}'::jsonb
  );

  -- 2. RESIDENCE "Residence Le Terrazze" (Sorrento)
  INSERT INTO entities (id, tenant_id, kind, slug, name, description, short_description, is_active, management_mode)
  VALUES (e_residence, v_tenant_id, 'accommodation', 'residence-le-terrazze',
    'Residence Le Terrazze',
    'demo_seed_v1 | Residence con 15 unità, vista mare, piscina, a Sorrento.',
    'Residence Sorrento', true, 'self_service');

  INSERT INTO accommodations (
    entity_id, property_type, is_imprenditoriale,
    legal_name, vat_number, fiscal_code, legal_details,
    address, city, province, zip, country, region,
    email, phone, pec,
    default_check_in_time, default_check_out_time, default_currency, default_language, default_vat_rate, timezone,
    fiscal_regime, has_vat,
    cedolare_secca_enabled, cedolare_secca_rate, ritenuta_ota_enabled, ritenuta_ota_rate,
    cin_code, cin_expiry, scia_number, scia_status, scia_expiry,
    istat_structure_code, sdi_code, invoice_prefix, invoice_next_number,
    pet_policy, cancellation_policy, payment_methods,
    tourist_tax_enabled, tourist_tax_max_nights, tourist_tax_municipality,
    self_checkin_enabled,
    amenities, settings
  ) VALUES (
    e_residence, 'residence', true,
    'Terrazze Sorrento SRL', 'IT04567890123', 'TRZSRR90B02F839M',
    '{"type":"srl"}'::jsonb,
    'Via Capo 33', 'Sorrento', 'NA', '80067', 'IT', 'Campania',
    'info@residenceleterrazze.it', '+39 081 987654', 'terrazze@pec.it',
    '16:00', '10:00', 'EUR', 'it', 10, 'Europe/Rome',
    'ordinario', true,
    false, 0, false, 0,
    'IT063084CNI67890', '2030-06-30', 'SCIA-NA-2022-0789', 'approved', '2027-06-30',
    '063084001', 'ABC1234', 'LT-2026', 1,
    '{"allowed":true,"fee_per_night":10,"max_pets":2}'::jsonb,
    '{"type":"strict","free_cancellation_days":14,"penalty_pct":100}'::jsonb,
    '["card","bank_transfer"]'::jsonb,
    true, 10, 'Sorrento',
    true,
    '["wifi","pool","parking","kitchen","sea_view","terrace","air_conditioning","washer"]'::jsonb,
    '{}'::jsonb
  );

  -- 3. MIXED "Lido Resort" (Gallipoli)
  INSERT INTO entities (id, tenant_id, kind, slug, name, description, short_description, is_active, management_mode)
  VALUES (e_mixed, v_tenant_id, 'accommodation', 'lido-resort',
    'Lido Resort & Apartments',
    'demo_seed_v1 | Struttura mista hotel+apt, 20 camere + 10 appartamenti, Gallipoli.',
    'Resort misto Gallipoli', true, 'self_service');

  INSERT INTO accommodations (
    entity_id, property_type, is_imprenditoriale,
    legal_name, vat_number, fiscal_code, legal_details,
    address, city, province, zip, country, region,
    email, phone, pec,
    default_check_in_time, default_check_out_time, default_currency, default_language, default_vat_rate, timezone,
    fiscal_regime, has_vat,
    cedolare_secca_enabled, cedolare_secca_rate, ritenuta_ota_enabled, ritenuta_ota_rate,
    cin_code, cin_expiry, scia_number, scia_status, scia_expiry,
    istat_structure_code, sdi_code, invoice_prefix, invoice_next_number,
    pet_policy, cancellation_policy, payment_methods,
    tourist_tax_enabled, tourist_tax_max_nights, tourist_tax_municipality,
    self_checkin_enabled, amenities, settings
  ) VALUES (
    e_mixed, 'mixed', true,
    'Lido Resort SPA', 'IT05678901234', 'LDRST85C03G273N',
    '{"type":"spa"}'::jsonb,
    'Lungomare Galilei 100', 'Gallipoli', 'LE', '73014', 'IT', 'Puglia',
    'info@lidoresort.it', '+39 0833 555123', 'lidoresort@pec.it',
    '15:00', '11:00', 'EUR', 'it', 10, 'Europe/Rome',
    'ordinario', true,
    false, 0, false, 0,
    'IT075031CNI34567', '2029-12-31', 'SCIA-LE-2021-0234', 'approved', '2026-12-31',
    '075031001', 'ABC1234', 'LR-2026', 1,
    '{"allowed":false}'::jsonb,
    '{"type":"flexible","free_cancellation_days":5,"penalty_pct":30}'::jsonb,
    '["card","bank_transfer","cash"]'::jsonb,
    true, 7, 'Gallipoli',
    true,
    '["wifi","pool","beach_access","restaurant","parking","air_conditioning"]'::jsonb,
    '{}'::jsonb
  );

  -- 4. B&B "Bed & Breakfast Il Glicine" (Firenze, non-imprenditoriale)
  INSERT INTO entities (id, tenant_id, kind, slug, name, description, short_description, is_active, management_mode)
  VALUES (e_bnb, v_tenant_id, 'accommodation', 'bnb-il-glicine',
    'B&B Il Glicine',
    'demo_seed_v1 | B&B 4 camere centro Firenze, gestione familiare non-imprenditoriale.',
    'B&B Firenze', true, 'self_service');

  INSERT INTO accommodations (
    entity_id, property_type, is_imprenditoriale,
    legal_name, fiscal_code, legal_details,
    address, city, province, zip, country, region,
    email, phone,
    default_check_in_time, default_check_out_time, default_currency, default_language, default_vat_rate, timezone,
    fiscal_regime, has_vat,
    cedolare_secca_enabled, cedolare_secca_rate, ritenuta_ota_enabled, ritenuta_ota_rate,
    cin_code, cin_expiry,
    istat_structure_code, sdi_code, invoice_prefix, invoice_next_number,
    pet_policy, cancellation_policy, payment_methods,
    tourist_tax_enabled, tourist_tax_max_nights, tourist_tax_municipality,
    self_checkin_enabled, amenities, settings
  ) VALUES (
    e_bnb, 'b_and_b', false,
    'Maria Rossi', 'RSSMRA70D44D612Z',
    '{"type":"persona_fisica"}'::jsonb,
    'Via del Proconsolo 18', 'Firenze', 'FI', '50122', 'IT', 'Toscana',
    'glicine@gmail.com', '+39 055 234567',
    '15:00', '10:30', 'EUR', 'it', 0, 'Europe/Rome',
    'cedolare_secca', false,
    true, 21, false, 0,
    'IT048017CNI98765', '2029-06-30',
    '048017001', '0000000', 'GL-2026', 1,
    '{"allowed":true,"fee_per_night":0,"max_pets":1}'::jsonb,
    '{"type":"flexible","free_cancellation_days":3,"penalty_pct":50}'::jsonb,
    '["cash","bank_transfer"]'::jsonb,
    true, 7, 'Firenze',
    true,
    '["wifi","breakfast","air_conditioning","garden"]'::jsonb,
    '{}'::jsonb
  );

  -- 5. CASA VACANZE "Villa Irabo" (slug già esistente, nostalgia)
  INSERT INTO entities (id, tenant_id, kind, slug, name, description, short_description, is_active, management_mode)
  VALUES (e_casa, v_tenant_id, 'accommodation', 'villa-irabo',
    'Villa Irabo',
    'demo_seed_v1 | Casa vacanze esclusiva in collina, 3 appartamenti indipendenti, Lago di Garda.',
    'Casa vacanze Garda', true, 'self_service');

  INSERT INTO accommodations (
    entity_id, property_type, is_imprenditoriale,
    legal_name, fiscal_code, legal_details,
    address, city, province, zip, country, region,
    email, phone,
    default_check_in_time, default_check_out_time, default_currency, default_language, default_vat_rate, timezone,
    fiscal_regime, has_vat,
    cedolare_secca_enabled, cedolare_secca_rate, ritenuta_ota_enabled, ritenuta_ota_rate,
    cin_code, cin_expiry,
    istat_structure_code, sdi_code, invoice_prefix, invoice_next_number,
    pet_policy, cancellation_policy, payment_methods,
    tourist_tax_enabled, tourist_tax_max_nights, tourist_tax_municipality,
    self_checkin_enabled, amenities, settings
  ) VALUES (
    e_casa, 'casa_vacanze', false,
    'Brian Cortinovis', 'CRTBRN86E15E507W',
    '{"type":"persona_fisica"}'::jsonb,
    'Strada del Vittoriale 5', 'Gardone Riviera', 'BS', '25083', 'IT', 'Lombardia',
    'brian@villairabo.it', '+39 0365 11223',
    '16:00', '10:00', 'EUR', 'it', 0, 'Europe/Rome',
    'cedolare_secca', false,
    true, 21, false, 0,
    'IT017078CNI11223', '2030-03-31',
    '017078001', '0000000', 'VI-2026', 1,
    '{"allowed":true,"fee_per_night":0}'::jsonb,
    '{"type":"strict","free_cancellation_days":30,"penalty_pct":100}'::jsonb,
    '["card","bank_transfer"]'::jsonb,
    true, 5, 'Gardone Riviera',
    true,
    '["wifi","lake_view","kitchen","parking","garden","bbq","pool"]'::jsonb,
    '{}'::jsonb
  );

  -- 6. AFFITTACAMERE "Le Quattro Camere" (Bologna)
  INSERT INTO entities (id, tenant_id, kind, slug, name, description, short_description, is_active, management_mode)
  VALUES (e_affitta, v_tenant_id, 'accommodation', 'le-quattro-camere',
    'Le Quattro Camere',
    'demo_seed_v1 | Affittacamere 5 camere, centro Bologna, regime forfettario.',
    'Affittacamere Bologna', true, 'self_service');

  INSERT INTO accommodations (
    entity_id, property_type, is_imprenditoriale,
    legal_name, vat_number, fiscal_code, legal_details,
    address, city, province, zip, country, region,
    email, phone, pec,
    default_check_in_time, default_check_out_time, default_currency, default_language, default_vat_rate, timezone,
    fiscal_regime, has_vat,
    cedolare_secca_enabled, cedolare_secca_rate, ritenuta_ota_enabled, ritenuta_ota_rate,
    cin_code, cin_expiry, scia_number, scia_status, scia_expiry,
    istat_structure_code, sdi_code, invoice_prefix, invoice_next_number,
    pet_policy, cancellation_policy, payment_methods,
    tourist_tax_enabled, tourist_tax_max_nights, tourist_tax_municipality,
    self_checkin_enabled, amenities, settings
  ) VALUES (
    e_affitta, 'affittacamere', true,
    'Quattro Camere di Bianchi Luigi', 'IT06789012345', 'BNCLGI75F16A944K',
    '{"type":"ditta_individuale"}'::jsonb,
    'Via Zamboni 42', 'Bologna', 'BO', '40126', 'IT', 'Emilia-Romagna',
    'info@lequattrocamere.it', '+39 051 334455', 'quattrocamere@pec.it',
    '14:00', '10:00', 'EUR', 'it', 10, 'Europe/Rome',
    'forfettario', true,
    false, 0, false, 0,
    'IT037006CNI44556', '2028-12-31', 'SCIA-BO-2022-0156', 'approved', '2027-12-31',
    '037006001', 'ABC1234', 'QC-2026', 1,
    '{"allowed":false}'::jsonb,
    '{"type":"moderate","free_cancellation_days":7,"penalty_pct":50}'::jsonb,
    '["card","cash","bank_transfer"]'::jsonb,
    true, 5, 'Bologna',
    true,
    '["wifi","breakfast","air_conditioning"]'::jsonb,
    '{}'::jsonb
  );

  -- 7. AGRITURISMO "Cascina dei Tre Colli" (Langhe)
  INSERT INTO entities (id, tenant_id, kind, slug, name, description, short_description, is_active, management_mode)
  VALUES (e_agri, v_tenant_id, 'accommodation', 'cascina-tre-colli',
    'Cascina dei Tre Colli',
    'demo_seed_v1 | Agriturismo con vigne, 8 camere + ristorante tipico, Langhe.',
    'Agriturismo Langhe', true, 'self_service');

  INSERT INTO accommodations (
    entity_id, property_type, is_imprenditoriale,
    legal_name, vat_number, fiscal_code, rea_number, legal_details,
    address, city, province, zip, country, region,
    email, phone, pec,
    default_check_in_time, default_check_out_time, default_currency, default_language, default_vat_rate, timezone,
    fiscal_regime, has_vat,
    cedolare_secca_enabled, cedolare_secca_rate, ritenuta_ota_enabled, ritenuta_ota_rate,
    cin_code, cin_expiry, scia_number, scia_status, scia_expiry,
    istat_structure_code, sdi_code, invoice_prefix, invoice_next_number,
    pet_policy, cancellation_policy, payment_methods,
    tourist_tax_enabled, tourist_tax_max_nights, tourist_tax_municipality,
    self_checkin_enabled, amenities, settings
  ) VALUES (
    e_agri, 'agriturismo', true,
    'Az. Agricola Tre Colli SS', 'IT07890123456', 'TRCLLI65G17A669L', 'CN-334455',
    '{"type":"societa_semplice_agricola"}'::jsonb,
    'Strada dei Colli 7', 'La Morra', 'CN', '12064', 'IT', 'Piemonte',
    'info@cascinatrecolli.it', '+39 0173 778899', 'trecolli@pec.it',
    '15:00', '11:00', 'EUR', 'it', 10, 'Europe/Rome',
    'agriturismo_special', true,
    false, 0, false, 0,
    'IT004107CNI77889', '2030-09-30', 'SCIA-CN-2020-0089', 'approved', '2027-09-30',
    '004107001', 'ABC1234', 'CTC-2026', 1,
    '{"allowed":true,"fee_per_night":0}'::jsonb,
    '{"type":"moderate","free_cancellation_days":14,"penalty_pct":50}'::jsonb,
    '["card","bank_transfer","cash"]'::jsonb,
    true, 7, 'La Morra',
    false,
    '["wifi","restaurant","farm_activities","wine_tasting","parking","garden","pool"]'::jsonb,
    '{"farm_products":["vino","olio","miele"]}'::jsonb
  );

  -- =========================================================================
  -- ROOM TYPES + ROOMS
  -- =========================================================================

  -- HOTEL: 3 tipologie x varie camere = 40 totali
  INSERT INTO room_types (id, entity_id, name, code, category, description, base_occupancy, max_occupancy, max_children, base_price, size_sqm, bed_configuration, amenities) VALUES
    ('20000000-0000-0000-0000-000000000101', e_hotel, 'Standard Double', 'STD', 'room', 'Camera doppia standard vista cortile', 2, 2, 0, 95, 22, '1 matrimoniale', '["wifi","tv","air_conditioning","minibar"]'::jsonb),
    ('20000000-0000-0000-0000-000000000102', e_hotel, 'Superior Sea View', 'SUP', 'room', 'Camera superior vista mare', 2, 3, 1, 145, 28, '1 matrimoniale + divano letto', '["wifi","tv","air_conditioning","minibar","balcony","sea_view"]'::jsonb),
    ('20000000-0000-0000-0000-000000000103', e_hotel, 'Junior Suite', 'JRS', 'room', 'Suite con salotto vista mare', 2, 4, 2, 220, 45, '1 king + 2 singoli', '["wifi","tv","air_conditioning","minibar","jacuzzi","sea_view","living_room"]'::jsonb);

  -- Hotel rooms: 20 std + 15 sup + 5 jrs = 40
  INSERT INTO rooms (entity_id, room_type_id, room_number, floor, status, is_active) SELECT e_hotel, '20000000-0000-0000-0000-000000000101', '1'||LPAD(n::text,2,'0'), 1, 'available', true FROM generate_series(1,20) n;
  INSERT INTO rooms (entity_id, room_type_id, room_number, floor, status, is_active) SELECT e_hotel, '20000000-0000-0000-0000-000000000102', '2'||LPAD(n::text,2,'0'), 2, 'available', true FROM generate_series(1,15) n;
  INSERT INTO rooms (entity_id, room_type_id, room_number, floor, status, is_active) SELECT e_hotel, '20000000-0000-0000-0000-000000000103', '3'||LPAD(n::text,2,'0'), 3, 'available', true FROM generate_series(1,5) n;

  -- RESIDENCE: 2 tipologie x 15 unita
  INSERT INTO room_types (id, entity_id, name, code, category, description, base_occupancy, max_occupancy, max_children, base_price, size_sqm, bed_configuration, amenities) VALUES
    ('20000000-0000-0000-0000-000000000201', e_residence, 'Bilocale Comfort', 'BIL', 'apartment', 'Appartamento bilocale vista giardino', 3, 4, 2, 135, 45, '1 matrimoniale + 1 divano letto', '["wifi","kitchen","tv","air_conditioning","washer"]'::jsonb),
    ('20000000-0000-0000-0000-000000000202', e_residence, 'Trilocale Vista Mare', 'TRI', 'apartment', 'Appartamento trilocale vista mare con terrazzo', 4, 6, 2, 195, 70, '1 matrimoniale + 2 singoli + divano letto', '["wifi","kitchen","tv","air_conditioning","washer","sea_view","terrace"]'::jsonb);

  INSERT INTO rooms (entity_id, room_type_id, room_number, floor, status, is_active) SELECT e_residence, '20000000-0000-0000-0000-000000000201', 'B0'||n, 0, 'available', true FROM generate_series(1,9) n;
  INSERT INTO rooms (entity_id, room_type_id, room_number, floor, status, is_active) SELECT e_residence, '20000000-0000-0000-0000-000000000202', 'T0'||n, 1, 'available', true FROM generate_series(1,6) n;

  -- MIXED: 3 tipologie (camere + apt)
  INSERT INTO room_types (id, entity_id, name, code, category, description, base_occupancy, max_occupancy, max_children, base_price, size_sqm, bed_configuration, amenities) VALUES
    ('20000000-0000-0000-0000-000000000301', e_mixed, 'Camera Classic', 'CLA', 'room', 'Camera doppia classica', 2, 2, 0, 85, 20, '1 matrimoniale', '["wifi","tv","air_conditioning"]'::jsonb),
    ('20000000-0000-0000-0000-000000000302', e_mixed, 'Camera Deluxe', 'DLX', 'room', 'Camera deluxe vista piscina', 2, 3, 1, 130, 25, '1 matrimoniale + 1 singolo', '["wifi","tv","air_conditioning","pool_view"]'::jsonb),
    ('20000000-0000-0000-0000-000000000303', e_mixed, 'Apartment', 'APT', 'apartment', 'Appartamento bilocale', 3, 4, 2, 160, 50, '1 matrimoniale + divano letto', '["wifi","kitchen","tv","air_conditioning","washer"]'::jsonb);

  INSERT INTO rooms (entity_id, room_type_id, room_number, floor, status, is_active) SELECT e_mixed, '20000000-0000-0000-0000-000000000301', 'C'||LPAD(n::text,2,'0'), 1, 'available', true FROM generate_series(1,10) n;
  INSERT INTO rooms (entity_id, room_type_id, room_number, floor, status, is_active) SELECT e_mixed, '20000000-0000-0000-0000-000000000302', 'D'||LPAD(n::text,2,'0'), 2, 'available', true FROM generate_series(1,10) n;
  INSERT INTO rooms (entity_id, room_type_id, room_number, floor, status, is_active) SELECT e_mixed, '20000000-0000-0000-0000-000000000303', 'A'||LPAD(n::text,2,'0'), 0, 'available', true FROM generate_series(1,10) n;

  -- B&B: single unit room type, 4 camere
  INSERT INTO room_types (id, entity_id, name, code, category, description, base_occupancy, max_occupancy, max_children, base_price, size_sqm, bed_configuration, amenities) VALUES
    ('20000000-0000-0000-0000-000000000401', e_bnb, 'Camera B&B', 'BNB', 'room', 'Camera doppia con colazione', 2, 3, 1, 95, 18, '1 matrimoniale', '["wifi","breakfast","air_conditioning"]'::jsonb);

  INSERT INTO rooms (entity_id, room_type_id, room_number, name, status, is_active) VALUES
    (e_bnb, '20000000-0000-0000-0000-000000000401', '1', 'Camera Lavanda', 'available', true),
    (e_bnb, '20000000-0000-0000-0000-000000000401', '2', 'Camera Rosa', 'available', true),
    (e_bnb, '20000000-0000-0000-0000-000000000401', '3', 'Camera Glicine', 'available', true),
    (e_bnb, '20000000-0000-0000-0000-000000000401', '4', 'Camera Salvia', 'available', true);

  -- CASA VACANZE: 3 appartamenti single-unit
  INSERT INTO room_types (id, entity_id, name, code, category, description, base_occupancy, max_occupancy, max_children, base_price, size_sqm, bed_configuration, amenities) VALUES
    ('20000000-0000-0000-0000-000000000501', e_casa, 'Appartamento Villa Irabo', 'APT', 'apartment', 'Appartamento intero vista lago', 4, 6, 2, 175, 75, '2 matrimoniali + 1 divano letto', '["wifi","kitchen","lake_view","parking","bbq"]'::jsonb);

  INSERT INTO rooms (entity_id, room_type_id, room_number, name, status, is_active) VALUES
    (e_casa, '20000000-0000-0000-0000-000000000501', 'A', 'Apt Salice', 'available', true),
    (e_casa, '20000000-0000-0000-0000-000000000501', 'B', 'Apt Olivo', 'available', true),
    (e_casa, '20000000-0000-0000-0000-000000000501', 'C', 'Apt Cipresso', 'available', true);

  -- AFFITTACAMERE: 5 camere
  INSERT INTO room_types (id, entity_id, name, code, category, description, base_occupancy, max_occupancy, max_children, base_price, size_sqm, bed_configuration, amenities) VALUES
    ('20000000-0000-0000-0000-000000000601', e_affitta, 'Camera Singola', 'SNG', 'room', 'Camera uso singolo', 1, 1, 0, 55, 12, '1 singolo', '["wifi","breakfast"]'::jsonb),
    ('20000000-0000-0000-0000-000000000602', e_affitta, 'Camera Doppia', 'DBL', 'room', 'Camera doppia standard', 2, 2, 0, 85, 16, '1 matrimoniale', '["wifi","breakfast","air_conditioning"]'::jsonb);

  INSERT INTO rooms (entity_id, room_type_id, room_number, status, is_active) VALUES
    (e_affitta, '20000000-0000-0000-0000-000000000601', '101', 'available', true),
    (e_affitta, '20000000-0000-0000-0000-000000000602', '102', 'available', true),
    (e_affitta, '20000000-0000-0000-0000-000000000602', '103', 'available', true),
    (e_affitta, '20000000-0000-0000-0000-000000000602', '104', 'available', true),
    (e_affitta, '20000000-0000-0000-0000-000000000602', '105', 'available', true);

  -- AGRITURISMO: 8 camere
  INSERT INTO room_types (id, entity_id, name, code, category, description, base_occupancy, max_occupancy, max_children, base_price, size_sqm, bed_configuration, amenities) VALUES
    ('20000000-0000-0000-0000-000000000701', e_agri, 'Camera Vigna', 'VGN', 'room', 'Camera vista vigneto', 2, 3, 1, 110, 22, '1 matrimoniale', '["wifi","vineyard_view","breakfast","air_conditioning"]'::jsonb),
    ('20000000-0000-0000-0000-000000000702', e_agri, 'Suite Cantina', 'CAN', 'suite', 'Suite con caminetto', 2, 4, 2, 180, 35, '1 king + divano letto', '["wifi","fireplace","vineyard_view","breakfast","jacuzzi"]'::jsonb);

  INSERT INTO rooms (entity_id, room_type_id, room_number, name, status, is_active) VALUES
    (e_agri, '20000000-0000-0000-0000-000000000701', '1', 'Nebbiolo', 'available', true),
    (e_agri, '20000000-0000-0000-0000-000000000701', '2', 'Barolo', 'available', true),
    (e_agri, '20000000-0000-0000-0000-000000000701', '3', 'Barbera', 'available', true),
    (e_agri, '20000000-0000-0000-0000-000000000701', '4', 'Dolcetto', 'available', true),
    (e_agri, '20000000-0000-0000-0000-000000000701', '5', 'Moscato', 'available', true),
    (e_agri, '20000000-0000-0000-0000-000000000701', '6', 'Arneis', 'available', true),
    (e_agri, '20000000-0000-0000-0000-000000000702', '7', 'Suite Langhe', 'available', true),
    (e_agri, '20000000-0000-0000-0000-000000000702', '8', 'Suite Monferrato', 'available', true);

  -- =========================================================================
  -- RATE PLANS (1 standard per entity)
  -- =========================================================================
  INSERT INTO rate_plans (id, entity_id, name, code, rate_type, meal_plan, description, is_public, is_active) VALUES
    ('30000000-0000-0000-0000-000000000001', e_hotel,     'Standard BB',       'STD_BB',  'standard', 'breakfast',  'Tariffa standard con colazione', true, true),
    ('30000000-0000-0000-0000-000000000002', e_residence, 'Weekly Stay',       'WKL',     'standard', 'room_only',  'Tariffa settimanale', true, true),
    ('30000000-0000-0000-0000-000000000003', e_mixed,     'Best Available',    'BAR',     'standard', 'breakfast',  'Tariffa migliore disponibile', true, true),
    ('30000000-0000-0000-0000-000000000004', e_bnb,       'Flex BB',           'FLEX',    'standard', 'breakfast',  'Tariffa flessibile con colazione', true, true),
    ('30000000-0000-0000-0000-000000000005', e_casa,      'Weekend/Weekly',    'WE_WK',   'standard', 'room_only',  'Tariffa weekend o settimanale', true, true),
    ('30000000-0000-0000-0000-000000000006', e_affitta,   'Solo Pernottamento','RO',      'standard', 'room_only',  'Solo pernottamento', true, true),
    ('30000000-0000-0000-0000-000000000007', e_agri,      'Mezza Pensione',    'HB',      'standard', 'half_board', 'Mezza pensione con cena tipica', true, true);

  -- =========================================================================
  -- SEASONS + RATE PRICES (Q2-Q4 2026 con modificatori stagionali)
  -- =========================================================================
  -- Seasons per hotel (esempio — altri usano prezzo base)
  INSERT INTO seasons (entity_id, name, color, date_from, date_to, price_modifier, min_stay, allowed_arrival_days, allowed_departure_days, stay_discounts) VALUES
    (e_hotel,     'Bassa 2026',  '#60a5fa', '2026-04-01', '2026-05-31', 0.85, 1, '{}', '{}', '[]'::jsonb),
    (e_hotel,     'Media 2026',  '#fbbf24', '2026-06-01', '2026-06-30', 1.00, 1, '{}', '{}', '[]'::jsonb),
    (e_hotel,     'Alta 2026',   '#ef4444', '2026-07-01', '2026-08-31', 1.40, 2, '{}', '{}', '[]'::jsonb),
    (e_hotel,     'Bassa2 2026', '#60a5fa', '2026-09-01', '2026-12-31', 0.90, 1, '{}', '{}', '[]'::jsonb),
    (e_residence, 'Estate 2026', '#ef4444', '2026-06-01', '2026-09-15', 1.35, 7, '{}', '{}', '[]'::jsonb),
    (e_mixed,     'Estate 2026', '#ef4444', '2026-06-15', '2026-09-10', 1.50, 3, '{}', '{}', '[]'::jsonb),
    (e_agri,      'Vendemmia',   '#f97316', '2026-09-01', '2026-10-31', 1.25, 2, '{}', '{}', '[]'::jsonb);

  -- Rate prices per ogni room_type x rate_plan, un range unico Q2-Q4 2026
  INSERT INTO rate_prices (rate_plan_id, room_type_id, date_from, date_to, price_per_night, extra_adult, extra_child, min_stay) VALUES
    -- HOTEL
    ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000101', '2026-04-01', '2026-12-31', 95,  30, 20, 1),
    ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000102', '2026-04-01', '2026-12-31', 145, 40, 25, 1),
    ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000103', '2026-04-01', '2026-12-31', 220, 50, 30, 2),
    -- RESIDENCE
    ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000201', '2026-04-01', '2026-12-31', 135, 25, 15, 3),
    ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000202', '2026-04-01', '2026-12-31', 195, 30, 20, 3),
    -- MIXED
    ('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000301', '2026-04-01', '2026-12-31', 85,  25, 15, 1),
    ('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000302', '2026-04-01', '2026-12-31', 130, 30, 20, 1),
    ('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000303', '2026-04-01', '2026-12-31', 160, 30, 20, 2),
    -- B&B
    ('30000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000401', '2026-04-01', '2026-12-31', 95,  20, 15, 1),
    -- CASA VACANZE
    ('30000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000501', '2026-04-01', '2026-12-31', 175, 25, 15, 2),
    -- AFFITTACAMERE
    ('30000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000601', '2026-04-01', '2026-12-31', 55,  0,  0,  1),
    ('30000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000602', '2026-04-01', '2026-12-31', 85,  20, 10, 1),
    -- AGRITURISMO
    ('30000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000701', '2026-04-01', '2026-12-31', 110, 25, 15, 2),
    ('30000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000702', '2026-04-01', '2026-12-31', 180, 35, 20, 2);

  -- =========================================================================
  -- UPSELL OFFERS (servizi extra per entity)
  -- =========================================================================
  INSERT INTO upsell_offers (entity_id, name, description, price, category, charge_mode, pricing_mode, is_active, online_bookable, sort_order) VALUES
    -- HOTEL
    (e_hotel, 'Colazione in camera', 'Colazione servita in camera', 15, 'food_beverage', 'paid', 'per_guest', true, true, 1),
    (e_hotel, 'Cena ristorante', 'Menu degustazione 4 portate', 55, 'food_beverage', 'paid', 'per_stay', true, true, 2),
    (e_hotel, 'Accesso SPA', 'Ingresso giornaliero spa', 35, 'spa_wellness', 'paid', 'per_night', true, true, 3),
    (e_hotel, 'Massaggio 60min', 'Massaggio rilassante', 70, 'spa_wellness', 'paid', 'per_stay', true, true, 4),
    (e_hotel, 'Parcheggio', 'Parcheggio garage coperto', 20, 'parking', 'paid', 'per_night', true, true, 5),
    (e_hotel, 'Transfer aeroporto', 'Navetta A/R', 90, 'transfer', 'paid', 'per_stay', true, true, 6),
    (e_hotel, 'Late checkout', 'Checkout fino alle 14:00', 30, 'late_checkout', 'paid', 'per_stay', true, true, 7),
    (e_hotel, 'Culla bambino', 'Culla per neonato', 10, 'baby_kit', 'paid', 'per_night', true, true, 8),
    -- RESIDENCE
    (e_residence, 'Pulizie extra', 'Pulizia extra appartamento', 40, 'linen', 'paid', 'per_stay', true, true, 1),
    (e_residence, 'Cambio biancheria', 'Set completo', 25, 'linen', 'paid', 'per_stay', true, true, 2),
    (e_residence, 'Kit benvenuto', 'Prosecco + prodotti locali', 30, 'food_beverage', 'paid', 'per_stay', true, true, 3),
    (e_residence, 'Noleggio bici', 'Per giorno', 15, 'bike', 'paid', 'per_day', true, true, 4),
    (e_residence, 'Lettino spiaggia', 'Ombrellone + lettino', 20, 'experience', 'paid', 'per_night', true, true, 5),
    -- MIXED
    (e_mixed, 'Colazione buffet', 'Colazione sala ristorante', 12, 'food_beverage', 'paid', 'per_guest', true, true, 1),
    (e_mixed, 'Aperitivo al tramonto', 'Aperitivo vista mare', 18, 'food_beverage', 'paid', 'per_stay', true, true, 2),
    (e_mixed, 'Lezione surf', 'Con istruttore', 55, 'experience', 'paid', 'per_stay', true, true, 3),
    (e_mixed, 'Escursione barca', 'Mezza giornata', 80, 'experience', 'paid', 'per_stay', true, true, 4),
    (e_mixed, 'Pet fee', 'Supplemento animale', 15, 'pet_kit', 'paid', 'per_night', true, true, 5),
    -- B&B
    (e_bnb, 'Colazione rinforzata', 'Dolce + salato', 8, 'food_beverage', 'paid', 'per_guest', true, true, 1),
    (e_bnb, 'Prosecco welcome', 'Bottiglia di prosecco', 18, 'food_beverage', 'paid', 'per_stay', true, true, 2),
    (e_bnb, 'Tour Firenze guidato', 'Con guida privata', 120, 'experience', 'paid', 'per_stay', true, true, 3),
    -- CASA VACANZE
    (e_casa, 'Pulizie finali', 'Supplemento pulizie', 80, 'linen', 'paid', 'per_stay', true, true, 1),
    (e_casa, 'Cesto benvenuto', 'Vino lago + specialità', 45, 'food_beverage', 'paid', 'per_stay', true, true, 2),
    (e_casa, 'Noleggio SUP', 'Con trasporto al lago', 35, 'experience', 'paid', 'per_stay', true, true, 3),
    (e_casa, 'Baby cot', 'Culla', 5, 'baby_kit', 'paid', 'per_night', true, true, 4),
    (e_casa, 'Chef a domicilio', 'Cena 4 portate', 180, 'food_beverage', 'paid', 'per_stay', true, true, 5),
    -- AFFITTACAMERE
    (e_affitta, 'Colazione', 'Continental breakfast', 7, 'food_beverage', 'paid', 'per_guest', true, true, 1),
    (e_affitta, 'Parcheggio pubblico', 'Permesso ZTL', 18, 'parking', 'paid', 'per_night', true, true, 2),
    -- AGRITURISMO
    (e_agri, 'Degustazione vini', 'Cantina 4 calici', 25, 'experience', 'paid', 'per_stay', true, true, 1),
    (e_agri, 'Cena tipica', 'Menu tradizione 5 portate + vino', 45, 'food_beverage', 'paid', 'per_stay', true, true, 2),
    (e_agri, 'Tour vigne', 'Con trattore', 20, 'experience', 'paid', 'per_stay', true, true, 3),
    (e_agri, 'Cooking class', 'Pasta fresca + pranzo', 75, 'experience', 'paid', 'per_stay', true, true, 4),
    (e_agri, 'Escursione tartufo', 'Con cane da tartufo', 95, 'experience', 'paid', 'per_stay', true, true, 5);

  -- =========================================================================
  -- TOURIST TAX RATES
  -- =========================================================================
  INSERT INTO tourist_tax_rates (entity_id, category, rate_per_person, is_exempt, is_active, max_nights) VALUES
    (e_hotel, 'adult', 3.50, false, true, 7),
    (e_hotel, 'teen_14_17', 1.75, false, true, 7),
    (e_hotel, 'child_0_9', 0, true, true, NULL),
    (e_residence, 'adult', 2.50, false, true, 10),
    (e_residence, 'child_0_9', 0, true, true, NULL),
    (e_mixed, 'adult', 2.00, false, true, 7),
    (e_mixed, 'child_0_9', 0, true, true, NULL),
    (e_bnb, 'adult', 5.00, false, true, 7),
    (e_bnb, 'child_0_9', 0, true, true, NULL),
    (e_casa, 'adult', 2.00, false, true, 5),
    (e_casa, 'child_0_9', 0, true, true, NULL),
    (e_affitta, 'adult', 3.00, false, true, 5),
    (e_affitta, 'child_0_9', 0, true, true, NULL),
    (e_agri, 'adult', 1.50, false, true, 7),
    (e_agri, 'child_0_9', 0, true, true, NULL);

  -- =========================================================================
  -- CHANNEL COMMISSIONS
  -- =========================================================================
  INSERT INTO channel_commissions (entity_id, channel, commission_rate, notes)
  SELECT e.id, ch.channel, ch.rate, 'demo_seed_v1'
  FROM entities e
  CROSS JOIN (VALUES
    ('booking_com', 15.0),
    ('expedia', 18.0),
    ('airbnb', 3.0),
    ('google', 12.0),
    ('direct', 0.0)
  ) AS ch(channel, rate)
  WHERE e.tenant_id = v_tenant_id;

  RAISE NOTICE 'Seeded 7 structures + rooms + rate plans + upsell + tasse';
END $$;
