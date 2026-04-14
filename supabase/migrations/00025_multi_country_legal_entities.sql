-- 00025: Multi-country + legal entities
-- Aggiunge supporto multi-paese su tenants e properties, tabella country_configs di riferimento

-- Colonne su tenants per legal entity
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS country TEXT NOT NULL DEFAULT 'IT'
  CHECK (country IN ('IT', 'CH', 'FR', 'AT', 'DE'));

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS legal_type TEXT NOT NULL DEFAULT 'private'
  CHECK (legal_type IN ('private', 'business'));

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS legal_details JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS billing_address_line1 TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS billing_address_line2 TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS billing_city TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS billing_state TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS billing_postal_code TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS billing_country TEXT;

-- Colonne su properties per legal entity struttura-specifica
ALTER TABLE properties ADD COLUMN IF NOT EXISTS country_override TEXT
  CHECK (country_override IN ('IT', 'CH', 'FR', 'AT', 'DE'));

ALTER TABLE properties ADD COLUMN IF NOT EXISTS is_imprenditoriale BOOLEAN DEFAULT true;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS legal_details JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Tabella di riferimento paesi supportati
CREATE TABLE IF NOT EXISTS country_configs (
  code TEXT PRIMARY KEY,
  name_it TEXT NOT NULL,
  currency TEXT NOT NULL,
  vat_rates JSONB NOT NULL DEFAULT '[]'::jsonb,
  legal_document_types JSONB NOT NULL DEFAULT '[]'::jsonb,
  required_fields_private JSONB NOT NULL DEFAULT '[]'::jsonb,
  required_fields_business JSONB NOT NULL DEFAULT '[]'::jsonb,
  fiscal_regimes JSONB NOT NULL DEFAULT '[]'::jsonb,
  allowed_property_types JSONB NOT NULL DEFAULT '[]'::jsonb,
  rental_authority_label TEXT,
  implementation_status TEXT NOT NULL DEFAULT 'planned'
    CHECK (implementation_status IN ('full', 'partial', 'planned', 'not_supported')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed country_configs
INSERT INTO country_configs (code, name_it, currency, vat_rates, legal_document_types, required_fields_private, required_fields_business, fiscal_regimes, allowed_property_types, rental_authority_label, implementation_status, notes) VALUES
  ('IT', 'Italia', 'EUR',
   '[{"label":"Standard","rate":22},{"label":"Turistica","rate":10},{"label":"Ridotta","rate":4}]'::jsonb,
   '["fattura_elettronica","ricevuta_non_fiscale","ricevuta_fiscale","nota_di_credito"]'::jsonb,
   '["fiscal_code","billing_address"]'::jsonb,
   '["legal_name","vat_number","fiscal_code","billing_address","sdi_code_or_pec"]'::jsonb,
   '["ordinario","forfettario","cedolare_secca","agriturismo_special"]'::jsonb,
   '["hotel","residence","mixed","b_and_b","agriturismo","apartment","affittacamere"]'::jsonb,
   'Alloggiati Web',
   'full',
   'Implementazione completa: regimi privato/impresa, CIN, Alloggiati, ISTAT, tassa soggiorno'),

  ('CH', 'Svizzera', 'CHF',
   '[{"label":"Standard","rate":8.1},{"label":"Ridotta","rate":2.6},{"label":"Alloggio","rate":3.8}]'::jsonb,
   '["facture","quittance"]'::jsonb,
   '[]'::jsonb,
   '[]'::jsonb,
   '[]'::jsonb,
   '["hotel","residence","b_and_b","apartment"]'::jsonb,
   NULL,
   'planned',
   'Placeholder. Fiscalità svizzera (UID, cantoni, IVA 8.1%) in arrivo.'),

  ('FR', 'Francia', 'EUR',
   '[{"label":"Standard","rate":20},{"label":"Intermédiaire","rate":10},{"label":"Réduite","rate":5.5}]'::jsonb,
   '["facture","note"]'::jsonb,
   '[]'::jsonb,
   '[]'::jsonb,
   '[]'::jsonb,
   '["hotel","residence","b_and_b","apartment"]'::jsonb,
   NULL,
   'planned',
   'Placeholder. Fiscalité française (SIRET, TVA, RCS) en cours.'),

  ('AT', 'Austria', 'EUR',
   '[{"label":"Standard","rate":20},{"label":"Reduziert","rate":10},{"label":"Beherbergung","rate":13}]'::jsonb,
   '["rechnung"]'::jsonb,
   '[]'::jsonb,
   '[]'::jsonb,
   '[]'::jsonb,
   '["hotel","residence","b_and_b","apartment"]'::jsonb,
   NULL,
   'planned',
   'Placeholder. Österreichische Fiskalität in Arbeit.'),

  ('DE', 'Germania', 'EUR',
   '[{"label":"Standard","rate":19},{"label":"Ermäßigt","rate":7}]'::jsonb,
   '["rechnung"]'::jsonb,
   '[]'::jsonb,
   '[]'::jsonb,
   '[]'::jsonb,
   '["hotel","residence","b_and_b","apartment"]'::jsonb,
   NULL,
   'planned',
   'Placeholder. Deutsche Fiskalität in Arbeit.')
ON CONFLICT (code) DO NOTHING;

-- RLS: country_configs è pubblica (read-only per tutti autenticati)
ALTER TABLE country_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "country_configs_read_all" ON country_configs FOR SELECT USING (true);
