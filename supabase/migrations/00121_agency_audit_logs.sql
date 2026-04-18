-- M066 S04: Agency audit log — append-only tracking per financial/config actions
-- Scope tripartito: platform (agency_id NULL), agency (agency_id SET), tenant (tenant_id SET)
-- RLS INSERT-only; SELECT scoped by role; UPDATE/DELETE deny-all.

CREATE TABLE IF NOT EXISTS public.agency_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email text,
  actor_role text CHECK (actor_role IN ('platform_admin','agency_owner','agency_admin','agency_member','tenant','system')),
  agency_id uuid REFERENCES public.agencies(id) ON DELETE SET NULL,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_type text,
  target_id uuid,
  status text NOT NULL DEFAULT 'ok' CHECK (status IN ('ok','denied','error')),
  ip_address inet,
  user_agent text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_agency_audit_logs_agency_created
  ON public.agency_audit_logs (agency_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agency_audit_logs_tenant_created
  ON public.agency_audit_logs (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agency_audit_logs_actor_created
  ON public.agency_audit_logs (actor_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agency_audit_logs_action
  ON public.agency_audit_logs (action, created_at DESC);

ALTER TABLE public.agency_audit_logs ENABLE ROW LEVEL SECURITY;

-- SELECT: platform admin vede tutto; agency member vede righe del proprio agency_id
CREATE POLICY "agency_audit_logs_select_platform" ON public.agency_audit_logs
  FOR SELECT
  USING (public.is_platform_admin());

CREATE POLICY "agency_audit_logs_select_agency" ON public.agency_audit_logs
  FOR SELECT
  USING (
    agency_id IS NOT NULL
    AND agency_id IN (
      SELECT agency_id FROM public.agency_memberships
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- INSERT: authenticated (helper server-side, service role bypass comunque)
CREATE POLICY "agency_audit_logs_insert_auth" ON public.agency_audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (actor_user_id = auth.uid() OR public.is_platform_admin());

-- Append-only: no UPDATE/DELETE policy → default deny
