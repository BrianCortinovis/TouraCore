-- Fix infinite recursion in platform_admins RLS policies.
-- Le policy di 00030 usano subquery su platform_admins stesso,
-- che è soggetto a RLS → ricorsione / righe vuote.
-- Uso la funzione is_platform_admin() SECURITY DEFINER già presente.

DROP POLICY IF EXISTS "platform_admins_select" ON public.platform_admins;
DROP POLICY IF EXISTS "platform_admins_manage" ON public.platform_admins;

-- Funzione helper per super_admin check (security definer bypassa RLS)
CREATE OR REPLACE FUNCTION public.is_platform_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_admins
    WHERE user_id = auth.uid() AND role = 'super_admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_platform_super_admin() TO authenticated;

-- SELECT: ogni platform_admin vede tutti i record
CREATE POLICY "platform_admins_select" ON public.platform_admins
  FOR SELECT
  USING (public.is_platform_admin());

-- INSERT/UPDATE/DELETE: solo super_admin
CREATE POLICY "platform_admins_manage" ON public.platform_admins
  FOR ALL
  USING (public.is_platform_super_admin())
  WITH CHECK (public.is_platform_super_admin());
