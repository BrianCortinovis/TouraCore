-- M067 S01: agency invitations token-based + permissions JSONB granular

CREATE TABLE IF NOT EXISTS public.agency_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('agency_owner','agency_admin','agency_member')),
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  token text NOT NULL,
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  accepted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_agency_invitations_token_active
  ON public.agency_invitations (token)
  WHERE accepted_at IS NULL AND revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_agency_invitations_agency
  ON public.agency_invitations (agency_id, created_at DESC);

ALTER TABLE public.agency_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agency_invitations_select" ON public.agency_invitations;
CREATE POLICY "agency_invitations_select" ON public.agency_invitations
  FOR SELECT
  USING (
    public.is_platform_admin()
    OR agency_id IN (
      SELECT agency_id FROM public.agency_memberships
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- INSERT/UPDATE gestiti via service role (server action)
-- Accept pubblico via RPC SECURITY DEFINER

CREATE OR REPLACE FUNCTION public.agency_invitation_accept(p_token text, p_user_id uuid)
RETURNS TABLE(agency_id uuid, membership_id uuid, role text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv record;
  v_membership_id uuid;
BEGIN
  SELECT id, agency_id, role, permissions, expires_at, accepted_at, revoked_at
    INTO v_inv
    FROM public.agency_invitations
    WHERE token = p_token
    FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'invitation_not_found'; END IF;
  IF v_inv.revoked_at IS NOT NULL THEN RAISE EXCEPTION 'invitation_revoked'; END IF;
  IF v_inv.accepted_at IS NOT NULL THEN RAISE EXCEPTION 'invitation_already_accepted'; END IF;
  IF v_inv.expires_at < now() THEN RAISE EXCEPTION 'invitation_expired'; END IF;

  INSERT INTO public.agency_memberships (agency_id, user_id, role, is_active, permissions)
    VALUES (v_inv.agency_id, p_user_id, v_inv.role::agency_role, true, v_inv.permissions)
    ON CONFLICT (agency_id, user_id) DO UPDATE
      SET is_active = true, role = EXCLUDED.role, permissions = EXCLUDED.permissions
    RETURNING id INTO v_membership_id;

  UPDATE public.agency_invitations
    SET accepted_at = now(), accepted_by = p_user_id
    WHERE id = v_inv.id;

  RETURN QUERY SELECT v_inv.agency_id, v_membership_id, v_inv.role;
END;
$$;

GRANT EXECUTE ON FUNCTION public.agency_invitation_accept(text, uuid) TO authenticated;
