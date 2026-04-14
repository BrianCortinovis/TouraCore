-- M013 S02: Platform admins table for superadmin panel
-- Tracks which users have platform-level admin access

CREATE TABLE IF NOT EXISTS public.platform_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  granted_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

-- Only platform admins can read the table
CREATE POLICY "platform_admins_select" ON public.platform_admins
  FOR SELECT
  USING (
    auth.uid() IN (SELECT user_id FROM public.platform_admins)
  );

-- Only super_admins can insert/update/delete
CREATE POLICY "platform_admins_manage" ON public.platform_admins
  FOR ALL
  USING (
    auth.uid() IN (SELECT user_id FROM public.platform_admins WHERE role = 'super_admin')
  );

-- Helper function
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid()
  );
$$;

-- Grant function execution
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;
