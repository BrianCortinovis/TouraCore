-- 00031: Colonne compliance IT su accommodations
-- Dipende da: 00028 (entities_tables)
-- Aggiunge campi fiscali, CIN/SCIA, credenziali Alloggiati, ISTAT, fatturazione, policy

-- ============================================================================
-- 1. COLONNE FISCALI
-- ============================================================================

ALTER TABLE accommodations
  ADD COLUMN fiscal_regime TEXT CHECK (fiscal_regime IN ('ordinario', 'forfettario', 'cedolare_secca', 'agriturismo_special')),
  ADD COLUMN has_vat BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN cedolare_secca_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN cedolare_secca_rate DECIMAL(5,2) NOT NULL DEFAULT 21.00,
  ADD COLUMN ritenuta_ota_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN ritenuta_ota_rate DECIMAL(5,2) NOT NULL DEFAULT 21.00;

-- ============================================================================
-- 2. CIN / SCIA
-- ============================================================================

ALTER TABLE accommodations
  ADD COLUMN cin_code TEXT,
  ADD COLUMN cin_expiry DATE,
  ADD COLUMN scia_number TEXT,
  ADD COLUMN scia_status TEXT CHECK (scia_status IN ('pending', 'approved', 'expired')),
  ADD COLUMN scia_expiry DATE;

-- ============================================================================
-- 3. ALLOGGIATI WEB (credenziali encrypted a livello applicativo)
-- ============================================================================

ALTER TABLE accommodations
  ADD COLUMN alloggiati_username TEXT,
  ADD COLUMN alloggiati_password_encrypted TEXT;

-- ============================================================================
-- 4. ISTAT / SDI / FATTURAZIONE
-- ============================================================================

ALTER TABLE accommodations
  ADD COLUMN istat_structure_code TEXT,
  ADD COLUMN sdi_code TEXT NOT NULL DEFAULT '0000000',
  ADD COLUMN invoice_prefix TEXT,
  ADD COLUMN invoice_next_number INTEGER NOT NULL DEFAULT 1;

-- ============================================================================
-- 5. POLICY E ALTRO
-- ============================================================================

ALTER TABLE accommodations
  ADD COLUMN star_rating INTEGER CHECK (star_rating >= 0 AND star_rating <= 5),
  ADD COLUMN pet_policy JSONB DEFAULT '{"allowed": false}'::jsonb,
  ADD COLUMN cancellation_policy JSONB DEFAULT '{"type": "flexible", "days_before": 1, "penalty_percent": 0}'::jsonb,
  ADD COLUMN payment_methods JSONB DEFAULT '["cash", "credit_card"]'::jsonb;

-- Indice per ricerche CIN (verifiche ispettive)
CREATE INDEX idx_accommodations_cin ON accommodations(cin_code) WHERE cin_code IS NOT NULL;
