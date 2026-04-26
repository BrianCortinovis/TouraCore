-- 00151_view_kpi_security_invoker.sql
-- 2026-04-26 · Audit fix S027
--
-- Le view KPI multi-tenant erano in modalità SECURITY DEFINER (default Postgres)
-- che bypassa RLS dell'utente chiamante. Per le view che mostrano dati cross-tenant
-- aggregati o per-entity, security_invoker=true forza l'applicazione della RLS
-- dell'utente sul query plan delle tabelle source.
--
-- View toccate (audit live state):
--   - v_financial_summary
--   - v_reservation_financials
--   - v_daily_kpi
--   - v_room_availability
--   - v_rooms_effective
--   - experience_manifest_view
--   - core_web_vitals_p75
--   - platform_seo_kpi_daily
--   - platform_seo_routes_problems
--
-- Le view public_* (filtrano is_published=true) restano in DEFINER mode intenzionalmente
-- per esporre dati a anon role.

-- Set security_invoker=true. ALTER VIEW SET (security_invoker=true) è idempotente.
-- Se la view non esiste (drift), il DO block sopprime l'errore.

DO $$
DECLARE
  v_name text;
  v_views text[] := ARRAY[
    'v_financial_summary',
    'v_reservation_financials',
    'v_daily_kpi',
    'v_room_availability',
    'v_rooms_effective',
    'experience_manifest_view',
    'core_web_vitals_p75',
    'platform_seo_kpi_daily',
    'platform_seo_routes_problems'
  ];
BEGIN
  FOREACH v_name IN ARRAY v_views
  LOOP
    BEGIN
      EXECUTE format('ALTER VIEW public.%I SET (security_invoker = true)', v_name);
      RAISE NOTICE 'View %.security_invoker = true applied', v_name;
    EXCEPTION WHEN undefined_table THEN
      RAISE NOTICE 'View % does not exist, skipping', v_name;
    END;
  END LOOP;
END $$;
