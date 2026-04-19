-- M093: Agency CRM tools — broadcast messaging, client notes, client tasks, health score

-- ============================================================================
-- 1. AGENCY BROADCAST — messaggi inviati a subset clienti
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.agency_broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  subject text NOT NULL,
  body_html text NOT NULL,
  body_text text,
  channel text NOT NULL DEFAULT 'email' CHECK (channel IN ('email','sms','whatsapp','in_app')),
  segment_filter jsonb NOT NULL DEFAULT '{}'::jsonb,
  recipients_count int NOT NULL DEFAULT 0,
  sent_count int NOT NULL DEFAULT 0,
  failed_count int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','queued','sending','sent','failed')),
  sent_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  scheduled_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agency_broadcasts_agency ON public.agency_broadcasts (agency_id, created_at DESC);

ALTER TABLE public.agency_broadcasts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agency_broadcasts_select" ON public.agency_broadcasts;
CREATE POLICY "agency_broadcasts_select" ON public.agency_broadcasts
  FOR SELECT
  USING (
    public.is_platform_admin()
    OR agency_id IN (
      SELECT agency_id FROM public.agency_memberships
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- ============================================================================
-- 2. CLIENT NOTES — annotazioni agenzia su ogni cliente
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.agency_client_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  author_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  body text NOT NULL,
  pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agency_client_notes_tenant ON public.agency_client_notes (agency_id, tenant_id, created_at DESC);

ALTER TABLE public.agency_client_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agency_client_notes_select" ON public.agency_client_notes;
CREATE POLICY "agency_client_notes_select" ON public.agency_client_notes
  FOR SELECT
  USING (
    public.is_platform_admin()
    OR agency_id IN (
      SELECT agency_id FROM public.agency_memberships
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- ============================================================================
-- 3. CLIENT TASKS — task agenzia su cliente (onboarding, follow-up, check-in)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.agency_client_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  assignee_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  due_date date,
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','done','cancelled')),
  completed_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agency_client_tasks_tenant ON public.agency_client_tasks (agency_id, tenant_id, status, due_date);
CREATE INDEX IF NOT EXISTS idx_agency_client_tasks_assignee ON public.agency_client_tasks (assignee_user_id, status) WHERE status IN ('open','in_progress');

ALTER TABLE public.agency_client_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agency_client_tasks_select" ON public.agency_client_tasks;
CREATE POLICY "agency_client_tasks_select" ON public.agency_client_tasks
  FOR SELECT
  USING (
    public.is_platform_admin()
    OR agency_id IN (
      SELECT agency_id FROM public.agency_memberships
      WHERE user_id = auth.uid() AND is_active = true
    )
  );
