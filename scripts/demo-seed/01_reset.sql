-- Demo seed RESET: wipe tutti i dati demo del tenant briansnow86
-- Idempotente. Ordine FK-safe.

DO $$
DECLARE
  v_tenant_id uuid := '89147f14-711e-4195-8e82-dd54f24e9457';
  v_entity_ids uuid[];
BEGIN
  SELECT array_agg(id) INTO v_entity_ids FROM entities WHERE tenant_id = v_tenant_id;

  IF v_entity_ids IS NULL OR array_length(v_entity_ids, 1) IS NULL THEN
    RAISE NOTICE 'No entities for tenant %, skipping.', v_tenant_id;
    RETURN;
  END IF;

  -- Layer 1: figli di reservations
  DELETE FROM tourist_tax_records WHERE entity_id = ANY(v_entity_ids);
  DELETE FROM upsell_orders WHERE entity_id = ANY(v_entity_ids);
  DELETE FROM invoice_items WHERE invoice_id IN (SELECT id FROM invoices WHERE entity_id = ANY(v_entity_ids));
  DELETE FROM payments WHERE entity_id = ANY(v_entity_ids);
  DELETE FROM commission_ledger WHERE tenant_id = v_tenant_id;
  DELETE FROM invoices WHERE entity_id = ANY(v_entity_ids);

  -- Layer 2: reservations + bookings
  DELETE FROM reservations WHERE entity_id = ANY(v_entity_ids);
  DELETE FROM bookings WHERE tenant_id = v_tenant_id;

  -- Layer 3: guests
  DELETE FROM guests WHERE entity_id = ANY(v_entity_ids);

  -- Layer 4: rate prices + rate plans + seasons
  DELETE FROM rate_prices WHERE rate_plan_id IN (SELECT id FROM rate_plans WHERE entity_id = ANY(v_entity_ids));
  DELETE FROM rate_plans WHERE entity_id = ANY(v_entity_ids);
  DELETE FROM seasons WHERE entity_id = ANY(v_entity_ids);

  -- Layer 5: rooms + room_types
  DELETE FROM rooms WHERE entity_id = ANY(v_entity_ids);
  DELETE FROM room_types WHERE entity_id = ANY(v_entity_ids);

  -- Layer 6: upsell + servizi + tasse
  DELETE FROM upsell_offers WHERE entity_id = ANY(v_entity_ids);
  DELETE FROM tourist_tax_rates WHERE entity_id = ANY(v_entity_ids);
  DELETE FROM channel_commissions WHERE entity_id = ANY(v_entity_ids);

  -- Layer 7: settings / misc
  DELETE FROM entity_settings WHERE entity_id = ANY(v_entity_ids);
  DELETE FROM message_templates WHERE entity_id = ANY(v_entity_ids);
  DELETE FROM self_checkin_configs WHERE entity_id = ANY(v_entity_ids);

  -- Layer 8: accommodations + entities
  DELETE FROM accommodations WHERE entity_id = ANY(v_entity_ids);
  DELETE FROM entities WHERE tenant_id = v_tenant_id;

  RAISE NOTICE 'Wiped % entities for tenant %', array_length(v_entity_ids, 1), v_tenant_id;
END $$;
