-- 00107: Experience schedules (weekly recurrence + exceptions + blackouts)
-- Dipende da: 00105_experience_products
-- Modulo: Experience M051/S01

CREATE TABLE public.experience_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.experience_products(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  -- weekly: array 7 giorni {dow: 0-6, slots: [{start:'09:00', capacity: 10}]}
  weekly_rules JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- exceptions: override date specifiche [{date:'2026-05-01', slots:[...], closed:false}]
  exceptions JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- blackouts: date chiuse [{from:'2026-08-15', to:'2026-08-20', reason:'ferie'}]
  blackouts JSONB NOT NULL DEFAULT '[]'::jsonb,
  valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_to DATE,
  timezone TEXT NOT NULL DEFAULT 'Europe/Rome',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  last_generated_at TIMESTAMPTZ,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (valid_to IS NULL OR valid_to >= valid_from)
);

CREATE INDEX idx_experience_schedules_product ON public.experience_schedules(product_id);
CREATE INDEX idx_experience_schedules_tenant ON public.experience_schedules(tenant_id);
CREATE INDEX idx_experience_schedules_active ON public.experience_schedules(product_id, active) WHERE active = TRUE;

ALTER TABLE public.experience_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "experience_schedules_select" ON public.experience_schedules
  FOR SELECT USING (
    tenant_id = ANY(get_user_tenant_ids())
    OR is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM public.agency_tenant_links atl
      WHERE atl.tenant_id = experience_schedules.tenant_id
        AND atl.agency_id = ANY(get_user_agency_ids())
        AND atl.status = 'active'
    )
  );

CREATE POLICY "experience_schedules_insert" ON public.experience_schedules
  FOR INSERT WITH CHECK (
    tenant_id = ANY(get_user_tenant_ids())
    OR is_platform_admin()
  );

CREATE POLICY "experience_schedules_update" ON public.experience_schedules
  FOR UPDATE USING (
    tenant_id = ANY(get_user_tenant_ids())
    OR is_platform_admin()
  );

CREATE POLICY "experience_schedules_delete" ON public.experience_schedules
  FOR DELETE USING (
    tenant_id = ANY(get_user_tenant_ids())
    OR is_platform_admin()
  );

CREATE TRIGGER set_experience_schedules_updated_at
  BEFORE UPDATE ON public.experience_schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

COMMENT ON TABLE public.experience_schedules IS 'Weekly recurrence + exceptions + blackouts per product. Materializzato in experience_timeslots.';
