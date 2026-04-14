-- 00046: Migrazione dati bookings → reservations (idempotente)
-- Dipende da: 00044 (reservations), 00033 (guests), 00028 (entities)
-- Sposta prenotazioni hospitality confermate/completate in reservations.
-- NON droppa bookings — resta per widget/portale pubblico.

-- Migra solo bookings hospitality con status non 'pending' (pending restano in bookings)
-- Per ogni booking senza guest_id, crea un guest on-the-fly
DO $$
DECLARE
  b RECORD;
  v_guest_id UUID;
  v_entity_id UUID;
  v_reservation_code TEXT;
  v_status reservation_status;
  v_seq INTEGER := 0;
BEGIN
  FOR b IN
    SELECT * FROM bookings
    WHERE vertical = 'hospitality'
      AND status IN ('confirmed', 'completed', 'canceled', 'no_show')
    ORDER BY created_at ASC
  LOOP
    -- Determina entity_id dal vertical_data o fallback
    v_entity_id := (b.vertical_data ->> 'entity_id')::UUID;
    IF v_entity_id IS NULL THEN
      -- Fallback: cerca entity per tenant
      SELECT e.id INTO v_entity_id
      FROM entities e
      WHERE e.tenant_id = b.tenant_id AND e.kind = 'accommodation'
      LIMIT 1;
    END IF;

    -- Se non trova entity, skip
    IF v_entity_id IS NULL THEN
      RAISE NOTICE 'Booking % skipped: nessuna entity per tenant %', b.id, b.tenant_id;
      CONTINUE;
    END IF;

    -- Guest: usa guest_id se presente, altrimenti crea
    IF b.guest_id IS NOT NULL THEN
      v_guest_id := b.guest_id;
    ELSE
      -- Cerca guest esistente per email+entity
      SELECT g.id INTO v_guest_id
      FROM guests g
      WHERE g.entity_id = v_entity_id
        AND g.email = b.guest_email
      LIMIT 1;

      -- Se non esiste, crea
      IF v_guest_id IS NULL THEN
        INSERT INTO guests (entity_id, first_name, last_name, email, phone)
        VALUES (
          v_entity_id,
          SPLIT_PART(b.guest_name, ' ', 1),
          COALESCE(NULLIF(TRIM(SUBSTRING(b.guest_name FROM POSITION(' ' IN b.guest_name))), ''), b.guest_name),
          b.guest_email,
          b.guest_phone
        )
        RETURNING id INTO v_guest_id;
      END IF;
    END IF;

    -- Mappa status
    CASE b.status
      WHEN 'confirmed' THEN v_status := 'confirmed';
      WHEN 'completed' THEN v_status := 'checked_out';
      WHEN 'canceled' THEN v_status := 'cancelled';
      WHEN 'no_show' THEN v_status := 'no_show';
      ELSE v_status := 'confirmed';
    END CASE;

    -- Genera codice
    v_seq := v_seq + 1;
    v_reservation_code := 'RES-' || to_char(b.created_at, 'YYYY') || '-' || LPAD(v_seq::TEXT, 5, '0');

    -- Evita duplicati (idempotenza)
    IF NOT EXISTS (
      SELECT 1 FROM reservations
      WHERE entity_id = v_entity_id
        AND guest_id = v_guest_id
        AND check_in = b.check_in
        AND check_out = b.check_out
    ) THEN
      INSERT INTO reservations (
        entity_id, reservation_code, guest_id,
        room_type_id, check_in, check_out,
        status, source, adults,
        total_amount, paid_amount, currency,
        commission_amount, commission_rate,
        special_requests, cancelled_at, cancellation_reason,
        created_at, updated_at
      )
      SELECT
        v_entity_id, v_reservation_code, v_guest_id,
        -- room_type_id: prende il primo disponibile per l'entity
        (SELECT rt.id FROM room_types rt WHERE rt.entity_id = v_entity_id AND rt.is_active = true LIMIT 1),
        b.check_in, b.check_out,
        v_status,
        'direct'::booking_source,
        COALESCE((b.vertical_data ->> 'adults')::INTEGER, 1),
        b.total_amount, 0, b.currency,
        COALESCE(b.commission_amount, 0), COALESCE(b.commission_rate, 0),
        b.notes, b.canceled_at, b.canceled_reason,
        b.created_at, b.updated_at
      WHERE EXISTS (SELECT 1 FROM room_types rt WHERE rt.entity_id = v_entity_id AND rt.is_active = true);
    END IF;
  END LOOP;
END;
$$;
