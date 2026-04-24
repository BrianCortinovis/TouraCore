-- Sync is_platform_admin into JWT app_metadata so middleware can check
-- without a DB round-trip (anon key cannot read platform_admins via RLS).
--
-- Trigger fires on INSERT/DELETE of platform_admins and calls
-- auth.update_user() via the pg_net extension to patch app_metadata.
-- Falls back gracefully if pg_net is not available (Supabase always has it).

CREATE OR REPLACE FUNCTION public.sync_platform_admin_jwt()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_flag    boolean;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_user_id := OLD.user_id;
    v_flag    := false;
  ELSE
    v_user_id := NEW.user_id;
    v_flag    := true;
  END IF;

  UPDATE auth.users
  SET raw_app_meta_data = raw_app_meta_data || jsonb_build_object('is_platform_admin', v_flag)
  WHERE id = v_user_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_platform_admin_jwt ON public.platform_admins;
CREATE TRIGGER trg_sync_platform_admin_jwt
  AFTER INSERT OR DELETE ON public.platform_admins
  FOR EACH ROW EXECUTE FUNCTION public.sync_platform_admin_jwt();

-- Backfill: mark existing platform admins in auth.users
UPDATE auth.users u
SET raw_app_meta_data = u.raw_app_meta_data || '{"is_platform_admin": true}'::jsonb
FROM public.platform_admins pa
WHERE pa.user_id = u.id;
