-- Migration 00138: agency_entity_billing
-- Accordo commerciale agenzia→entità del cliente.
-- Livello entity (non tenant) perché un cliente può avere hotel + bike + ristorante
-- con commissioni diverse per verticale.
--
-- Fallback resolution:
--   1. Record in questa tabella per (agency_id, entity_id)  ← win
--   2. DEFAULT_TIERS in packages/core/agency/src/commissions.ts per tipo verticale

CREATE TABLE public.agency_entity_billing (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id       UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  entity_id       UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  tenant_id       UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

  billing_model   TEXT NOT NULL DEFAULT 'commission'
    CHECK (billing_model IN ('subscription', 'commission', 'hybrid', 'free')),

  -- canone fisso mensile agenzia→cliente (usato in subscription / hybrid)
  fee_monthly_eur NUMERIC(10,2) CHECK (fee_monthly_eur IS NULL OR fee_monthly_eur >= 0),

  -- commissione % per prenotazione (usata in commission / hybrid)
  commission_pct  NUMERIC(5,2)  CHECK (commission_pct IS NULL OR (commission_pct >= 0 AND commission_pct <= 100)),

  -- cap massimo commissione per singola prenotazione
  commission_cap_eur NUMERIC(10,2) CHECK (commission_cap_eur IS NULL OR commission_cap_eur >= 0),

  notes           TEXT,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (agency_id, entity_id)
);

-- Indici
CREATE INDEX idx_aeb_agency    ON public.agency_entity_billing(agency_id);
CREATE INDEX idx_aeb_entity    ON public.agency_entity_billing(entity_id);
CREATE INDEX idx_aeb_tenant    ON public.agency_entity_billing(tenant_id);

-- updated_at automatico
CREATE TRIGGER trg_aeb_updated_at
  BEFORE UPDATE ON public.agency_entity_billing
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS
ALTER TABLE public.agency_entity_billing ENABLE ROW LEVEL SECURITY;

-- Agenzia vede e gestisce solo le proprie entity billing
CREATE POLICY "aeb_select_agency" ON public.agency_entity_billing
  FOR SELECT USING (agency_id = ANY(get_user_agency_ids()));

CREATE POLICY "aeb_insert_agency" ON public.agency_entity_billing
  FOR INSERT WITH CHECK (agency_id = ANY(get_user_agency_ids()));

CREATE POLICY "aeb_update_agency" ON public.agency_entity_billing
  FOR UPDATE USING (agency_id = ANY(get_user_agency_ids()));

CREATE POLICY "aeb_delete_agency" ON public.agency_entity_billing
  FOR DELETE USING (agency_id = ANY(get_user_agency_ids()));

-- Superadmin vede tutto
CREATE POLICY "aeb_platform_admin" ON public.agency_entity_billing
  FOR ALL USING (is_platform_admin()) WITH CHECK (is_platform_admin());
