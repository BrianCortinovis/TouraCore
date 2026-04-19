-- M088 S01: agency client invitations (invitare NUOVI tenant cliente)
-- Diverso da agency_invitations (team agency): questo serve per onboardare clienti tenant

CREATE TABLE IF NOT EXISTS public.agency_client_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  email text NOT NULL,
  tenant_name text,
  vertical_hint text CHECK (vertical_hint IN ('hospitality','restaurant','wellness','experiences','bike_rental','moto_rental','ski_school')),
  billing_mode text NOT NULL DEFAULT 'client_direct' CHECK (billing_mode IN ('client_direct','agency_covered')),
  management_mode text NOT NULL DEFAULT 'self_service' CHECK (management_mode IN ('agency_managed','self_service')),
  token text NOT NULL,
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  accepted_at timestamptz,
  accepted_tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  accepted_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_agency_client_invitations_token_active
  ON public.agency_client_invitations (token)
  WHERE accepted_at IS NULL AND revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_agency_client_invitations_agency
  ON public.agency_client_invitations (agency_id, created_at DESC);

ALTER TABLE public.agency_client_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agency_client_invitations_select" ON public.agency_client_invitations;
CREATE POLICY "agency_client_invitations_select" ON public.agency_client_invitations
  FOR SELECT
  USING (
    public.is_platform_admin()
    OR agency_id IN (
      SELECT agency_id FROM public.agency_memberships
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- INSERT/UPDATE via service role (server action only)
-- Accept via RPC SECURITY DEFINER (consuma token + associa tenant)

CREATE OR REPLACE FUNCTION public.agency_client_invitation_accept(
  p_token text,
  p_user_id uuid,
  p_tenant_id uuid
)
RETURNS TABLE(agency_id uuid, link_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv record;
  v_link_id uuid;
BEGIN
  SELECT id, agency_id, billing_mode, management_mode, expires_at, accepted_at, revoked_at
    INTO v_inv
    FROM public.agency_client_invitations
    WHERE token = p_token
    FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'invitation_not_found'; END IF;
  IF v_inv.revoked_at IS NOT NULL THEN RAISE EXCEPTION 'invitation_revoked'; END IF;
  IF v_inv.accepted_at IS NOT NULL THEN RAISE EXCEPTION 'invitation_already_accepted'; END IF;
  IF v_inv.expires_at < now() THEN RAISE EXCEPTION 'invitation_expired'; END IF;

  -- Popola tenants.agency_id
  UPDATE public.tenants
    SET agency_id = v_inv.agency_id
    WHERE id = p_tenant_id;

  -- Crea link attivo
  INSERT INTO public.agency_tenant_links (
    agency_id, tenant_id, billing_mode, default_management_mode, status, invited_at, accepted_at
  ) VALUES (
    v_inv.agency_id, p_tenant_id, v_inv.billing_mode, v_inv.management_mode, 'active', v_inv.expires_at - interval '14 days', now()
  )
  ON CONFLICT (agency_id, tenant_id) DO UPDATE
    SET status = 'active', accepted_at = now(), revoked_at = NULL
  RETURNING id INTO v_link_id;

  -- Marca invito consumato
  UPDATE public.agency_client_invitations
    SET accepted_at = now(), accepted_user_id = p_user_id, accepted_tenant_id = p_tenant_id
    WHERE id = v_inv.id;

  RETURN QUERY SELECT v_inv.agency_id, v_link_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.agency_client_invitation_accept(text, uuid, uuid) TO authenticated, service_role;
