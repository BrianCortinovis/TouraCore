-- Demo seed RESERVATIONS: Q2-Q4 2026, ~70% occupancy per room
-- Mix: adulti/bambini/infants/pet, canali vari, stati vari, payments, invoices, upsell_orders, tourist_tax_records

DO $$
DECLARE
  v_tenant_id uuid := '89147f14-711e-4195-8e82-dd54f24e9457';
  v_start date := '2026-04-01';
  v_end date := '2026-12-31';

  r_room record;
  r_rt record;
  v_cursor date;
  v_check_in date;
  v_check_out date;
  v_nights int;
  v_guest_id uuid;
  v_res_id uuid;
  v_invoice_id uuid;
  v_adults int;
  v_children int;
  v_infants int;
  v_pets int;
  v_source booking_source;
  v_status reservation_status;
  v_meal meal_plan;
  v_base_price numeric;
  v_modifier numeric;
  v_total numeric;
  v_commission_rate numeric;
  v_commission_amount numeric;
  v_rate_plan_id uuid;
  v_entity_id uuid;
  v_property_type text;
  v_has_vat boolean;
  v_vat_rate numeric;
  v_fiscal_regime text;
  v_invoice_prefix text;
  v_invoice_counter int;
  v_first_names text[] := ARRAY['Marco','Laura','Giovanni','Sofia','Andrea','Chiara','Luca','Giulia','Francesco','Elena','Matteo','Martina','Davide','Alessia','Simone','Valentina','Riccardo','Sara','Alberto','Federica','Hans','Emma','Pierre','Sophie','James','Olivia','Klaus','Anna','Liam','Isabella'];
  v_last_names text[] := ARRAY['Rossi','Bianchi','Ferrari','Esposito','Romano','Colombo','Ricci','Marino','Greco','Bruno','Gallo','Conti','De Luca','Mancini','Costa','Giordano','Rizzo','Moretti','Barbieri','Fontana','Mueller','Schmidt','Dubois','Martin','Smith','Brown','Garcia','Silva','OConnor','Nguyen'];
  v_countries text[] := ARRAY['IT','IT','IT','IT','IT','IT','DE','FR','UK','ES','US','NL','CH','AT','BE','IT','IT','DE','FR','IT'];
  v_pet_names text[] := ARRAY['Rex','Luna','Zeus','Bella','Max','Kira','Rocco','Pepper','Toby','Lily'];
  v_first text;
  v_last text;
  v_country text;
  v_roll numeric;
  v_stay_roll numeric;
  v_occ_target numeric := 0.70;
  v_res_counter int := 0;
  v_invoice_num text;
  v_paid numeric;
  v_ota_prepaid numeric;
BEGIN
  -- Seed RNG deterministico
  PERFORM setseed(0.42);

  -- Loop su tutte le rooms del tenant demo
  FOR r_room IN
    SELECT r.id as room_id, r.entity_id, r.room_type_id,
           rt.base_occupancy, rt.max_occupancy, rt.max_children,
           a.property_type, a.has_vat, a.default_vat_rate, a.fiscal_regime, a.invoice_prefix,
           (SELECT id FROM rate_plans rp WHERE rp.entity_id = r.entity_id LIMIT 1) as rate_plan_id,
           (SELECT price_per_night FROM rate_prices rp2
              WHERE rp2.room_type_id = r.room_type_id LIMIT 1) as base_price
    FROM rooms r
    JOIN room_types rt ON rt.id = r.room_type_id
    JOIN accommodations a ON a.entity_id = r.entity_id
    WHERE r.entity_id IN (SELECT id FROM entities WHERE tenant_id = v_tenant_id)
    ORDER BY r.entity_id, r.room_number
  LOOP
    v_entity_id := r_room.entity_id;
    v_property_type := r_room.property_type;
    v_has_vat := r_room.has_vat;
    v_vat_rate := COALESCE(r_room.default_vat_rate, 0);
    v_fiscal_regime := r_room.fiscal_regime;
    v_invoice_prefix := r_room.invoice_prefix;
    v_rate_plan_id := r_room.rate_plan_id;
    v_base_price := COALESCE(r_room.base_price, 100);

    v_cursor := v_start;
    WHILE v_cursor <= v_end LOOP
      -- Decisione: questo slot è prenotato? (target 70%)
      v_roll := random();
      IF v_roll > v_occ_target THEN
        -- Gap vuoto random 1-4 notti
        v_cursor := v_cursor + (1 + floor(random()*4))::int;
        CONTINUE;
      END IF;

      -- Durata stay: diversa per tipo
      v_stay_roll := random();
      IF v_property_type IN ('casa_vacanze','residence') THEN
        v_nights := 5 + floor(random()*10)::int;  -- 5-14 notti
      ELSIF v_property_type = 'agriturismo' THEN
        v_nights := 2 + floor(random()*4)::int;   -- 2-5
      ELSIF v_property_type = 'b_and_b' THEN
        v_nights := 1 + floor(random()*4)::int;   -- 1-4
      ELSE
        v_nights := 1 + floor(random()*6)::int;   -- 1-6
      END IF;

      v_check_in := v_cursor;
      v_check_out := v_cursor + v_nights;
      IF v_check_out > v_end THEN EXIT; END IF;

      -- Guest
      v_first := v_first_names[1 + floor(random()*array_length(v_first_names,1))::int];
      v_last := v_last_names[1 + floor(random()*array_length(v_last_names,1))::int];
      v_country := v_countries[1 + floor(random()*array_length(v_countries,1))::int];

      INSERT INTO guests (entity_id, first_name, last_name, email, phone, country, nationality,
                          document_type, document_number, document_country, privacy_consent, privacy_consent_date)
      VALUES (v_entity_id, v_first, v_last,
              lower(v_first)||'.'||lower(v_last)||floor(random()*999)::text||'@example.com',
              '+39 3'||floor(random()*900000000+100000000)::text,
              v_country, v_country,
              CASE WHEN random() < 0.7 THEN 'passport' ELSE 'id_card' END,
              'D'||lpad(floor(random()*99999999)::text, 8, '0'),
              v_country, true, v_check_in - 7)
      RETURNING id INTO v_guest_id;

      -- Adults / children / pets: mix realistico
      v_roll := random();
      IF v_roll < 0.10 THEN
        v_adults := 1; v_children := 0; v_infants := 0;
      ELSIF v_roll < 0.55 THEN
        v_adults := 2; v_children := 0; v_infants := 0;
      ELSIF v_roll < 0.75 THEN
        v_adults := 2; v_children := 1 + floor(random()*2)::int; v_infants := CASE WHEN random() < 0.3 THEN 1 ELSE 0 END;
      ELSIF v_roll < 0.90 THEN
        v_adults := 2 + floor(random()*2)::int; v_children := 2; v_infants := 0;
      ELSE
        v_adults := 3 + floor(random()*3)::int; v_children := 0; v_infants := 0;
      END IF;

      -- Clamp al max_occupancy
      IF v_adults + v_children > r_room.max_occupancy THEN
        v_adults := r_room.max_occupancy - v_children;
        IF v_adults < 1 THEN v_adults := 1; v_children := r_room.max_occupancy - 1; END IF;
      END IF;

      -- Pets (10% dei casi se la struttura li accetta)
      v_pets := CASE WHEN v_property_type IN ('hotel','residence','b_and_b','casa_vacanze','agriturismo') AND random() < 0.12 THEN 1 ELSE 0 END;

      -- Canale
      v_roll := random();
      IF v_roll < 0.35 THEN v_source := 'booking_com';
      ELSIF v_roll < 0.55 THEN v_source := 'direct';
      ELSIF v_roll < 0.70 THEN v_source := 'airbnb';
      ELSIF v_roll < 0.80 THEN v_source := 'expedia';
      ELSIF v_roll < 0.90 THEN v_source := 'website';
      ELSIF v_roll < 0.95 THEN v_source := 'phone';
      ELSE v_source := 'walk_in';
      END IF;

      -- Stato: dipende da data vs oggi (2026-04-17)
      IF v_check_out < '2026-04-17'::date THEN
        v_roll := random();
        IF v_roll < 0.88 THEN v_status := 'checked_out';
        ELSIF v_roll < 0.95 THEN v_status := 'cancelled';
        ELSE v_status := 'no_show';
        END IF;
      ELSIF v_check_in <= '2026-04-17'::date AND v_check_out >= '2026-04-17'::date THEN
        v_status := 'checked_in';
      ELSE
        v_roll := random();
        IF v_roll < 0.92 THEN v_status := 'confirmed';
        ELSE v_status := 'cancelled';
        END IF;
      END IF;

      -- Meal plan per tipo
      IF v_property_type = 'agriturismo' THEN v_meal := 'half_board';
      ELSIF v_property_type IN ('hotel','b_and_b','affittacamere') THEN v_meal := 'breakfast';
      ELSE v_meal := 'room_only';
      END IF;

      -- Seasonal price modifier
      IF v_check_in BETWEEN '2026-07-01' AND '2026-08-31' THEN v_modifier := 1.40;
      ELSIF v_check_in BETWEEN '2026-06-01' AND '2026-09-15' THEN v_modifier := 1.20;
      ELSIF v_check_in BETWEEN '2026-12-20' AND '2026-12-31' THEN v_modifier := 1.30;
      ELSE v_modifier := 1.00;
      END IF;

      v_total := ROUND((v_base_price * v_modifier * v_nights)::numeric, 2);
      -- Extra guest surcharge
      IF v_adults > r_room.base_occupancy THEN
        v_total := v_total + (v_adults - r_room.base_occupancy) * 25 * v_nights;
      END IF;
      v_total := v_total + v_children * 15 * v_nights;
      v_total := v_total + v_pets * 10 * v_nights;

      -- Commission
      IF v_source = 'booking_com' THEN v_commission_rate := 15;
      ELSIF v_source = 'expedia' THEN v_commission_rate := 18;
      ELSIF v_source = 'airbnb' THEN v_commission_rate := 3;
      ELSIF v_source = 'website' THEN v_commission_rate := 2;
      ELSE v_commission_rate := 0;
      END IF;
      v_commission_amount := ROUND((v_total * v_commission_rate / 100)::numeric, 2);

      -- OTA prepaid
      v_ota_prepaid := 0;
      IF v_source IN ('booking_com','expedia') AND random() < 0.4 THEN
        v_ota_prepaid := v_total;
      END IF;

      -- Paid amount per stato
      IF v_status = 'checked_out' THEN v_paid := v_total;
      ELSIF v_status = 'checked_in' THEN v_paid := ROUND((v_total * (0.5 + random()*0.5))::numeric, 2);
      ELSIF v_status = 'confirmed' THEN v_paid := ROUND((v_total * random() * 0.5)::numeric, 2);
      ELSIF v_status = 'cancelled' THEN v_paid := 0;
      ELSE v_paid := 0;
      END IF;

      -- Reservation
      v_res_counter := v_res_counter + 1;
      INSERT INTO reservations (
        entity_id, reservation_code, guest_id, room_id, room_type_id, rate_plan_id,
        check_in, check_out, actual_check_in, actual_check_out,
        status, source, adults, children, infants, pet_count, pet_details, meal_plan,
        total_amount, paid_amount, currency, commission_amount, commission_rate,
        channel_reservation_id, channel_name, ota_payment_type, ota_prepaid_amount,
        special_requests, internal_notes, cancelled_at, cancellation_reason
      ) VALUES (
        v_entity_id, v_invoice_prefix||'-'||lpad(v_res_counter::text, 5, '0'),
        v_guest_id, r_room.room_id, r_room.room_type_id, v_rate_plan_id,
        v_check_in, v_check_out,
        CASE WHEN v_status IN ('checked_in','checked_out') THEN v_check_in::timestamp + interval '15 hours' END,
        CASE WHEN v_status = 'checked_out' THEN v_check_out::timestamp + interval '10 hours' END,
        v_status, v_source, v_adults, v_children, v_infants, v_pets,
        CASE WHEN v_pets > 0 THEN jsonb_build_array(jsonb_build_object('name', v_pet_names[1+floor(random()*array_length(v_pet_names,1))::int], 'type','dog','weight_kg', 8+floor(random()*15)::int)) ELSE '[]'::jsonb END,
        v_meal,
        v_total, v_paid, 'EUR', v_commission_amount, v_commission_rate,
        CASE WHEN v_source IN ('booking_com','expedia','airbnb') THEN upper(substring(v_source::text,1,3))||floor(random()*900000000+100000000)::text END,
        v_source::text,
        CASE WHEN v_ota_prepaid > 0 THEN 'ota_collect'::ota_payment_type
             WHEN v_source IN ('booking_com','expedia') THEN 'pay_at_property'::ota_payment_type END,
        v_ota_prepaid,
        CASE WHEN random() < 0.15 THEN (ARRAY['Late check-in','Allergia latticini','Richiesta piano alto','Early check-in se possibile','Letto aggiunto bambino','Culla'])[1+floor(random()*6)::int] END,
        'demo_seed_v1',
        CASE WHEN v_status = 'cancelled' THEN v_check_in - 3 END,
        CASE WHEN v_status = 'cancelled' THEN (ARRAY['Cambio programma','Problema famiglia','Trovata alternativa','Malattia'])[1+floor(random()*4)::int] END
      ) RETURNING id INTO v_res_id;

      -- Payments (solo se paid > 0)
      IF v_paid > 0 THEN
        INSERT INTO payments (entity_id, reservation_id, guest_id, amount, currency, payment_date, payment_method, description)
        VALUES (v_entity_id, v_res_id, v_guest_id, v_paid, 'EUR',
                CASE WHEN v_status = 'checked_out' THEN v_check_out ELSE v_check_in - 7 END,
                CASE WHEN v_source IN ('booking_com','expedia') AND v_ota_prepaid > 0 THEN 'online'
                     WHEN random() < 0.7 THEN 'credit_card' ELSE 'bank_transfer' END,
                'demo_seed_v1 payment');
      END IF;

      -- Tourist tax records (solo checked_out/checked_in, adulti)
      IF v_status IN ('checked_out','checked_in') AND v_adults > 0 THEN
        INSERT INTO tourist_tax_records (
          entity_id, reservation_id, guest_id, tax_date, nights,
          guests_count, rate_per_person, total_amount, is_exempt, is_collected
        ) VALUES (
          v_entity_id, v_res_id, v_guest_id, v_check_in,
          LEAST(v_nights, 7),
          v_adults,
          CASE WHEN v_property_type = 'hotel' THEN 3.50
               WHEN v_property_type = 'b_and_b' THEN 5.00
               WHEN v_property_type = 'affittacamere' THEN 3.00
               WHEN v_property_type = 'residence' THEN 2.50
               WHEN v_property_type IN ('mixed','casa_vacanze') THEN 2.00
               ELSE 1.50 END,
          v_adults * LEAST(v_nights, 7) *
            CASE WHEN v_property_type = 'hotel' THEN 3.50
                 WHEN v_property_type = 'b_and_b' THEN 5.00
                 WHEN v_property_type = 'affittacamere' THEN 3.00
                 WHEN v_property_type = 'residence' THEN 2.50
                 WHEN v_property_type IN ('mixed','casa_vacanze') THEN 2.00
                 ELSE 1.50 END,
          false,
          v_status = 'checked_out'
        );
      END IF;

      -- Invoice (solo checked_out, tipo coerente col regime fiscale)
      IF v_status = 'checked_out' THEN
        v_invoice_num := v_invoice_prefix||'/'||lpad(v_res_counter::text, 6, '0');
        INSERT INTO invoices (
          entity_id, reservation_id, guest_id,
          invoice_type, invoice_number, invoice_date,
          customer_name, customer_country,
          subtotal, total_vat, total,
          payment_method, payment_status, sdi_status, notes
        ) VALUES (
          v_entity_id, v_res_id, v_guest_id,
          CASE WHEN v_property_type IN ('b_and_b','casa_vacanze') AND NOT v_has_vat THEN 'receipt'
               WHEN v_property_type = 'hotel' THEN 'corrispettivo'
               ELSE 'invoice' END,
          v_invoice_num, v_check_out,
          v_first||' '||v_last, v_country,
          ROUND((v_total / (1 + v_vat_rate/100))::numeric, 2),
          ROUND((v_total - v_total/(1+v_vat_rate/100))::numeric, 2),
          v_total,
          'credit_card', 'paid',
          CASE WHEN v_has_vat THEN 'accepted' ELSE 'draft' END,
          'demo_seed_v1'
        ) RETURNING id INTO v_invoice_id;

        INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, vat_rate, vat_amount, total, sort_order)
        VALUES (v_invoice_id,
                'Soggiorno '||v_nights||' notti ('||v_check_in||' / '||v_check_out||')',
                v_nights, ROUND((v_total/v_nights)::numeric, 2),
                v_vat_rate,
                ROUND((v_total - v_total/(1+v_vat_rate/100))::numeric, 2),
                v_total, 1);
      END IF;

      -- Upsell orders (30% delle reservations non cancellate: 1-2 servizi)
      IF v_status NOT IN ('cancelled','no_show') AND random() < 0.3 THEN
        INSERT INTO upsell_orders (entity_id, reservation_id, upsell_offer_id, quantity, unit_price, total, currency, status)
        SELECT v_entity_id, v_res_id, uo.id,
               1 + floor(random()*2)::int,
               uo.price,
               uo.price * (1 + floor(random()*2)::int),
               'EUR',
               CASE WHEN v_status = 'checked_out' THEN 'delivered' ELSE 'confirmed' END
        FROM upsell_offers uo
        WHERE uo.entity_id = v_entity_id
        ORDER BY random()
        LIMIT 1 + floor(random()*2)::int;
      END IF;

      v_cursor := v_check_out;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Seeded % reservations', v_res_counter;
END $$;
