-- M091: billing per-unit + entity snapshots mensili
-- Dipende da: module_catalog (00058), entities (00028), tenants (00002)

-- Estensione catalogo con prezzo per-unit (oltre a base_price_eur)
ALTER TABLE public.module_catalog
  ADD COLUMN IF NOT EXISTS price_per_unit_eur NUMERIC(10,2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.module_catalog.price_per_unit_eur IS 'Prezzo EUR per ogni entità extra oltre la prima (es. 2a location bike)';

-- Snapshot storico conteggi entity per tenant+modulo, fatturato a fine mese
CREATE TABLE IF NOT EXISTS public.entity_billing_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  module_code TEXT NOT NULL REFERENCES public.module_catalog(code) ON DELETE RESTRICT,
  period_month DATE NOT NULL,
  entity_count INT NOT NULL DEFAULT 0 CHECK (entity_count >= 0),
  unit_price_eur NUMERIC(10,2) NOT NULL DEFAULT 0,
  base_price_eur NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_eur NUMERIC(10,2) NOT NULL DEFAULT 0,
  stripe_subitem_id TEXT,
  stripe_sync_status TEXT DEFAULT 'pending' CHECK (stripe_sync_status IN ('pending','synced','failed','skipped')),
  stripe_sync_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, module_code, period_month)
);

CREATE INDEX IF NOT EXISTS idx_entity_billing_snapshots_tenant
  ON public.entity_billing_snapshots (tenant_id, period_month DESC);

CREATE INDEX IF NOT EXISTS idx_entity_billing_snapshots_pending
  ON public.entity_billing_snapshots (stripe_sync_status, created_at)
  WHERE stripe_sync_status = 'pending';

ALTER TABLE public.entity_billing_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ebs_select_tenant_staff" ON public.entity_billing_snapshots;
CREATE POLICY "ebs_select_tenant_staff" ON public.entity_billing_snapshots
  FOR SELECT
  USING (
    public.is_platform_admin()
    OR tenant_id IN (
      SELECT tenant_id FROM public.memberships
      WHERE user_id = auth.uid() AND is_active = true AND role IN ('owner','admin')
    )
  );

-- Insert/update via service role solo
