-- Migration 00139: agency_platform_billing
-- Accordo commerciale TouraCore (piattaforma) → agenzia.
-- Separato da agency_entity_billing (agenzia→suo cliente).
--
-- Modelli supportati:
--   subscription : canone fisso mensile piattaforma→agenzia
--   commission   : % sulle prenotazioni aggregate dei clienti dell'agenzia
--   hybrid       : fisso mensile + % commissione
--   free         : gratuito (pilota, partner, ecc.)
--
-- commission_base:
--   'client_revenue'  → % sul fatturato aggregato dei tenant sotto l'agenzia
--   'agency_fee'      → % sulle commissioni che l'agenzia incassa dai suoi clienti

CREATE TABLE public.agency_platform_billing (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id           UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,

  billing_model       TEXT NOT NULL DEFAULT 'commission'
    CHECK (billing_model IN ('subscription', 'commission', 'hybrid', 'free')),

  -- canone fisso mensile piattaforma→agenzia (subscription / hybrid)
  fee_monthly_eur     NUMERIC(10,2) CHECK (fee_monthly_eur IS NULL OR fee_monthly_eur >= 0),

  -- commissione % (commission / hybrid)
  commission_pct      NUMERIC(5,2)  CHECK (commission_pct IS NULL OR (commission_pct >= 0 AND commission_pct <= 100)),

  -- su cosa si calcola la % (default: fatturato clienti aggregato)
  commission_base     TEXT NOT NULL DEFAULT 'client_revenue'
    CHECK (commission_base IN ('client_revenue', 'agency_fee')),

  -- cap per mese (null = nessun cap)
  commission_cap_monthly_eur NUMERIC(10,2) CHECK (commission_cap_monthly_eur IS NULL OR commission_cap_monthly_eur >= 0),

  -- minimo mensile garantito (anche se commissione < min)
  commission_min_monthly_eur NUMERIC(10,2) CHECK (commission_min_monthly_eur IS NULL OR commission_min_monthly_eur >= 0),

  -- soglia fatturato clienti sotto cui non si applica commissione
  commission_threshold_eur   NUMERIC(10,2) CHECK (commission_threshold_eur IS NULL OR commission_threshold_eur >= 0),

  -- note interne superadmin
  notes               TEXT,

  -- chi ha configurato e quando
  set_by_user_id      UUID,
  valid_from          DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until         DATE,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (agency_id)
);

CREATE INDEX idx_apb_agency ON public.agency_platform_billing(agency_id);

CREATE TRIGGER trg_apb_updated_at
  BEFORE UPDATE ON public.agency_platform_billing
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.agency_platform_billing ENABLE ROW LEVEL SECURITY;

-- Solo superadmin gestisce
CREATE POLICY "apb_platform_admin" ON public.agency_platform_billing
  FOR ALL USING (is_platform_admin()) WITH CHECK (is_platform_admin());
