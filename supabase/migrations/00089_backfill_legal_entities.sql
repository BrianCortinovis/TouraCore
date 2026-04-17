-- 00089: Backfill legal_entities per tenant esistenti
--
-- Per ogni tenant:
--  - Crea 1 legal_entity default 'business' con dati da accommodations/restaurants esistenti (se presenti)
--  - Se non presenti, crea placeholder da completare via onboarding
--  - Link tutte le entities del tenant → legal_entity default

DO $$
DECLARE
  r RECORD;
  acc RECORD;
  v_le_id UUID;
  v_vat TEXT;
  v_cf TEXT;
  v_company TEXT;
  v_display TEXT;
BEGIN
  FOR r IN SELECT id, name, slug FROM tenants LOOP

    -- Skip se già esiste legal_entity per tenant
    IF EXISTS (SELECT 1 FROM legal_entities WHERE tenant_id = r.id) THEN
      CONTINUE;
    END IF;

    -- Prova estrarre dati fiscali da accommodation (hospitality)
    SELECT vat_number, fiscal_code, legal_name INTO v_vat, v_cf, v_company
    FROM accommodations a
    JOIN entities e ON e.id = a.entity_id
    WHERE e.tenant_id = r.id
      AND (vat_number IS NOT NULL OR fiscal_code IS NOT NULL)
    ORDER BY a.entity_id LIMIT 1;

    -- Fallback placeholder
    IF v_cf IS NULL AND v_vat IS NULL THEN
      v_cf := 'PENDING_' || UPPER(SUBSTR(REPLACE(r.id::text, '-', ''), 1, 11));
      v_company := r.name;
      v_display := r.name || ' (da completare)';
    ELSE
      v_display := COALESCE(v_company, r.name);
    END IF;

    -- Inserisci legal_entity default business
    INSERT INTO legal_entities (
      tenant_id,
      type,
      display_name,
      fiscal_code,
      vat_number,
      company_name,
      fiscal_regime,
      is_default,
      is_active,
      notes
    )
    VALUES (
      r.id,
      'business',
      v_display,
      COALESCE(v_cf, 'PENDING_' || UPPER(SUBSTR(REPLACE(r.id::text, '-', ''), 1, 11))),
      v_vat,
      COALESCE(v_company, r.name),
      CASE WHEN v_vat IS NOT NULL THEN 'ordinario' ELSE 'ordinario' END,
      TRUE,
      TRUE,
      'Auto-creato da backfill 00089. Verifica dati fiscali in /settings/legal.'
    )
    RETURNING id INTO v_le_id;

    -- Link tutte entities del tenant a questo legal_entity
    -- Disabilita temporaneamente trigger per evitare check vertical durante backfill
    -- (restaurant potrebbe avere CF placeholder - OK)
    UPDATE entities
    SET legal_entity_id = v_le_id
    WHERE tenant_id = r.id AND legal_entity_id IS NULL;

  END LOOP;
END $$;

-- Verifica post-backfill
DO $$
DECLARE
  v_unlinked INT;
BEGIN
  SELECT COUNT(*) INTO v_unlinked FROM entities WHERE legal_entity_id IS NULL;
  IF v_unlinked > 0 THEN
    RAISE WARNING 'Backfill 00089: % entities restano senza legal_entity_id', v_unlinked;
  ELSE
    RAISE NOTICE 'Backfill 00089 OK: tutte le entities collegate a legal_entity.';
  END IF;
END $$;
