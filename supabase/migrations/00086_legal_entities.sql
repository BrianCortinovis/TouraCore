-- 00086: Legal entities (cappelli fiscali) + enforcement regime per vertical
--
-- Modello Italia:
--  - tenant = workspace CMS (Mario)
--  - legal_entity = soggetto fiscale emittente (Mario privato OR Mario SRL OR Mario occasionale)
--  - entity = proprietà/attività operativa (villa, ristorante, tour) → legal_entity_id FK
--
-- Regole ITA:
--  - Hospitality può avere legal_entity type='private' (locazione turistica <30gg, niente P.IVA)
--  - Restaurant/experience/bike/wellness/moto/ski → SEMPRE P.IVA (business o occasionale con limiti)
--  - Regime 'occasionale': prestazione occasionale max €5000/anno/committente con ritenuta 20%
--  - Regime 'forfettario': <€85k, no IVA, marca bollo €2 >€77.47
--  - Regime 'ordinario': IVA standard 22%/10%/5%/0%

CREATE TABLE IF NOT EXISTS public.legal_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

  -- Tipologia soggetto
  type TEXT NOT NULL CHECK (type IN ('private', 'business', 'occasionale')),

  -- Dati anagrafici (sempre richiesti)
  display_name TEXT NOT NULL,
  fiscal_code TEXT NOT NULL,

  -- Dati business/occasionale (NULL per private)
  vat_number TEXT,
  company_name TEXT,
  legal_form TEXT, -- 'srl','snc','sas','spa','individual','cooperative','associazione'
  rea_number TEXT,
  chamber_of_commerce TEXT,

  -- Regime fiscale
  fiscal_regime TEXT CHECK (fiscal_regime IN (
    'locazione_turistica_privata', -- type='private' only
    'cedolare_secca_21',           -- type='private' locazione breve
    'cedolare_secca_26',           -- type='private' >4 unità
    'ordinario',                   -- type='business'
    'forfettario',                 -- type='business' <€85k
    'agricolo',                    -- type='business' agriturismo
    'regime_agevolato',            -- type='business' impresa turistica ridotto
    'prestazione_occasionale'      -- type='occasionale'
  )),

  -- SDI / e-invoicing (business only)
  sdi_recipient_code TEXT,       -- codice destinatario 7 char
  sdi_pec TEXT,                   -- PEC fallback
  sdi_transmission_mode TEXT CHECK (sdi_transmission_mode IN ('auto','manual','disabled')) DEFAULT 'auto',

  -- RT device (ristorazione)
  rt_device_serial TEXT,
  rt_provider TEXT CHECK (rt_provider IN ('epson','custom','rchitalia','olivetti','other')),
  rt_config JSONB DEFAULT '{}'::jsonb,

  -- Address fiscale (sede legale)
  address_street TEXT,
  address_city TEXT,
  address_zip TEXT,
  address_province CHAR(2),
  address_country CHAR(2) DEFAULT 'IT',

  -- Bank / payout
  iban TEXT,
  bic TEXT,

  -- Stripe Connect
  stripe_connect_account_id TEXT UNIQUE,
  stripe_connect_status TEXT CHECK (stripe_connect_status IN ('pending','onboarding','active','restricted','rejected','disabled')) DEFAULT 'pending',
  stripe_connect_capabilities JSONB DEFAULT '{}'::jsonb,
  stripe_connect_requirements JSONB DEFAULT '{}'::jsonb,

  -- CIN (Codice Identificativo Nazionale) — per locazione turistica
  cin_code TEXT,
  cin_region_code TEXT,

  -- Limiti regime occasionale (tracciamento annuo)
  occasionale_annual_limit_cents BIGINT DEFAULT 500000, -- €5000 default
  occasionale_ytd_revenue_cents BIGINT DEFAULT 0,

  -- Stato
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,

  -- Meta
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints coerenza type/regime
  CONSTRAINT le_private_no_vat CHECK (
    (type != 'private') OR (vat_number IS NULL)
  ),
  CONSTRAINT le_business_requires_vat CHECK (
    (type != 'business') OR (vat_number IS NOT NULL AND LENGTH(vat_number) >= 11)
  ),
  CONSTRAINT le_private_regime CHECK (
    (type != 'private') OR (fiscal_regime IN ('locazione_turistica_privata','cedolare_secca_21','cedolare_secca_26'))
  ),
  CONSTRAINT le_business_regime CHECK (
    (type != 'business') OR (fiscal_regime IN ('ordinario','forfettario','agricolo','regime_agevolato'))
  ),
  CONSTRAINT le_occasionale_regime CHECK (
    (type != 'occasionale') OR (fiscal_regime = 'prestazione_occasionale')
  ),

  UNIQUE (tenant_id, vat_number),
  UNIQUE (tenant_id, fiscal_code, type)
);

CREATE INDEX IF NOT EXISTS idx_legal_entities_tenant ON public.legal_entities(tenant_id);
CREATE INDEX IF NOT EXISTS idx_legal_entities_type ON public.legal_entities(tenant_id, type);
CREATE INDEX IF NOT EXISTS idx_legal_entities_active ON public.legal_entities(tenant_id) WHERE is_active = TRUE;
CREATE UNIQUE INDEX IF NOT EXISTS idx_legal_entities_default ON public.legal_entities(tenant_id) WHERE is_default = TRUE;

-- ============================================================================
-- RLS
-- ============================================================================

ALTER TABLE public.legal_entities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "legal_entities_select" ON public.legal_entities
  FOR SELECT USING (
    tenant_id = ANY(get_user_tenant_ids())
    OR is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM agency_tenant_links atl
      WHERE atl.tenant_id = legal_entities.tenant_id
        AND atl.agency_id = ANY(get_user_agency_ids())
        AND atl.status = 'active'
    )
  );

CREATE POLICY "legal_entities_insert" ON public.legal_entities
  FOR INSERT WITH CHECK (
    tenant_id = ANY(get_user_tenant_ids())
    OR is_platform_admin()
  );

CREATE POLICY "legal_entities_update" ON public.legal_entities
  FOR UPDATE USING (
    tenant_id = ANY(get_user_tenant_ids())
    OR is_platform_admin()
  );

CREATE POLICY "legal_entities_delete" ON public.legal_entities
  FOR DELETE USING (
    tenant_id = ANY(get_user_tenant_ids())
    OR is_platform_admin()
  );

DROP TRIGGER IF EXISTS set_legal_entities_updated_at ON public.legal_entities;
CREATE TRIGGER set_legal_entities_updated_at
  BEFORE UPDATE ON public.legal_entities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- Link entities → legal_entities
-- ============================================================================

ALTER TABLE public.entities
  ADD COLUMN IF NOT EXISTS legal_entity_id UUID REFERENCES public.legal_entities(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_entities_legal_entity ON public.entities(legal_entity_id);

-- ============================================================================
-- Trigger: enforcement Italia per vertical → legal_entity.type
--   Solo hospitality (kind='accommodation') + property_type residenziale può essere 'private'
--   Tutti gli altri vertical richiedono 'business' o 'occasionale'
-- ============================================================================

CREATE OR REPLACE FUNCTION public.enforce_entity_legal_form()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  le_type TEXT;
  le_tenant UUID;
BEGIN
  IF NEW.legal_entity_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT type, tenant_id INTO le_type, le_tenant
  FROM public.legal_entities
  WHERE id = NEW.legal_entity_id;

  -- Legal entity deve appartenere allo stesso tenant
  IF le_tenant != NEW.tenant_id THEN
    RAISE EXCEPTION 'legal_entity_id % not owned by tenant %', NEW.legal_entity_id, NEW.tenant_id
      USING ERRCODE = '23514';
  END IF;

  -- Solo accommodation può avere type='private'
  IF le_type = 'private' AND NEW.kind != 'accommodation' THEN
    RAISE EXCEPTION 'Italia fiscal: entity kind=% cannot use legal_entity type=private. Solo accommodation supporta locazione turistica privata.', NEW.kind
      USING ERRCODE = '23514';
  END IF;

  -- Tutti i kind diversi da accommodation devono essere business o occasionale
  IF NEW.kind IN ('restaurant','activity','wellness','bike_rental','moto_rental','ski_school') AND le_type NOT IN ('business','occasionale') THEN
    RAISE EXCEPTION 'Italia fiscal: entity kind=% richiede legal_entity type IN (business, occasionale). type=% non ammesso.', NEW.kind, le_type
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_entity_legal_form_trigger ON public.entities;
CREATE TRIGGER enforce_entity_legal_form_trigger
  BEFORE INSERT OR UPDATE OF legal_entity_id, kind ON public.entities
  FOR EACH ROW EXECUTE FUNCTION public.enforce_entity_legal_form();

-- ============================================================================
-- Audit: log emissioni fiscali per legal_entity (per regime occasionale tracking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.legal_entity_revenue_ledger (
  id BIGSERIAL PRIMARY KEY,
  legal_entity_id UUID NOT NULL REFERENCES public.legal_entities(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  document_id UUID,
  bundle_item_id UUID,
  amount_cents BIGINT NOT NULL,
  vat_cents BIGINT NOT NULL DEFAULT 0,
  year INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_le_revenue_ledger_year ON public.legal_entity_revenue_ledger(legal_entity_id, year);

ALTER TABLE public.legal_entity_revenue_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "le_revenue_ledger_select" ON public.legal_entity_revenue_ledger
  FOR SELECT USING (
    tenant_id = ANY(get_user_tenant_ids())
    OR is_platform_admin()
  );

CREATE POLICY "le_revenue_ledger_insert" ON public.legal_entity_revenue_ledger
  FOR INSERT WITH CHECK (
    tenant_id = ANY(get_user_tenant_ids())
    OR is_platform_admin()
  );

-- ============================================================================
-- Helper: increment occasionale YTD + warn quando supera limite
-- ============================================================================

CREATE OR REPLACE FUNCTION public.register_legal_entity_revenue(
  p_legal_entity_id UUID,
  p_amount_cents BIGINT,
  p_vat_cents BIGINT DEFAULT 0,
  p_document_id UUID DEFAULT NULL,
  p_bundle_item_id UUID DEFAULT NULL
)
RETURNS TABLE (
  ledger_id BIGINT,
  ytd_cents BIGINT,
  limit_cents BIGINT,
  over_limit BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant UUID;
  v_type TEXT;
  v_limit BIGINT;
  v_year INT := EXTRACT(YEAR FROM NOW());
  v_ledger_id BIGINT;
  v_ytd BIGINT;
BEGIN
  SELECT tenant_id, type, occasionale_annual_limit_cents
  INTO v_tenant, v_type, v_limit
  FROM legal_entities
  WHERE id = p_legal_entity_id;

  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'legal_entity % not found', p_legal_entity_id;
  END IF;

  INSERT INTO legal_entity_revenue_ledger (legal_entity_id, tenant_id, document_id, bundle_item_id, amount_cents, vat_cents, year)
  VALUES (p_legal_entity_id, v_tenant, p_document_id, p_bundle_item_id, p_amount_cents, p_vat_cents, v_year)
  RETURNING id INTO v_ledger_id;

  IF v_type = 'occasionale' THEN
    UPDATE legal_entities
    SET occasionale_ytd_revenue_cents = occasionale_ytd_revenue_cents + p_amount_cents
    WHERE id = p_legal_entity_id
    RETURNING occasionale_ytd_revenue_cents INTO v_ytd;
  ELSE
    v_ytd := 0;
  END IF;

  RETURN QUERY SELECT v_ledger_id, v_ytd, v_limit, (v_type = 'occasionale' AND v_ytd > v_limit);
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_legal_entity_revenue TO authenticated, service_role;

-- ============================================================================
-- Comment
-- ============================================================================

COMMENT ON TABLE public.legal_entities IS
'Cappelli fiscali per tenant. Un tenant può avere N legal_entities (private per locazione turistica, business per P.IVA, occasionale per prestazioni <€5k/anno). Italia-compliant via trigger enforcement.';

COMMENT ON COLUMN public.legal_entities.type IS
'private = persona fisica locazione turistica no P.IVA (solo hospitality). business = P.IVA SRL/SNC/individual. occasionale = prestazione occasionale max €5k/anno.';

COMMENT ON COLUMN public.legal_entities.fiscal_regime IS
'Regime fiscale. cedolare_secca_21/26 per private hospitality. forfettario/ordinario/agricolo/regime_agevolato per business. prestazione_occasionale per occasionale.';
