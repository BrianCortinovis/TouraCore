-- 00050: Fix recursive RLS helper functions
-- Le helper usate dalle policy RLS leggono tabelle soggette a RLS.
-- Se RLS resta attivo dentro la funzione, si può creare recursion o
-- una query che non termina mai. Qui disattiviamo RLS nel contesto
-- della funzione e manteniamo invariata la logica di autorizzazione.

CREATE OR REPLACE FUNCTION public.get_user_agency_ids()
RETURNS UUID[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT COALESCE(
    ARRAY_AGG(agency_id),
    ARRAY[]::UUID[]
  )
  FROM public.agency_memberships
  WHERE user_id = auth.uid()
    AND is_active = true;
$$;

CREATE OR REPLACE FUNCTION public.get_user_tenant_ids()
RETURNS UUID[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT COALESCE(
    ARRAY_AGG(tenant_id),
    ARRAY[]::UUID[]
  )
  FROM public.memberships
  WHERE user_id = auth.uid()
    AND is_active = true;
$$;

CREATE OR REPLACE FUNCTION public.get_user_organization_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT tenant_id
  FROM public.memberships
  WHERE user_id = auth.uid()
    AND is_active = true;
$$;

CREATE OR REPLACE FUNCTION public.get_user_entity_ids()
RETURNS UUID[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT COALESCE(
    ARRAY_AGG(e.id),
    ARRAY[]::UUID[]
  )
  FROM public.entities e
  WHERE e.tenant_id = ANY(public.get_user_tenant_ids());
$$;
