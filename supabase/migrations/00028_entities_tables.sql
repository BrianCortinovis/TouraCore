-- 00028: Entity abstraction — entities + accommodations + activities + data migration
-- Dipende da: properties (00007), tenants (00002), 00027
-- Fase T02 — solo CREATE e INSERT, zero distruzione. properties resta intatta.

-- ============================================================================
-- 1. ENTITIES — astrazione unificata per strutture e attività
-- ============================================================================

CREATE TABLE entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('accommodation', 'activity')),
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  short_description TEXT,
  country_override TEXT CHECK (country_override IN ('IT', 'CH', 'FR', 'AT', 'DE')),
  management_mode TEXT NOT NULL DEFAULT 'self_service'
    CHECK (management_mode IN ('agency_managed', 'self_service')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, slug)
);

ALTER TABLE entities ENABLE ROW LEVEL SECURITY;

-- RLS: accesso via membership tenant O via agency con link attivo
CREATE POLICY "entities_select" ON entities
  FOR SELECT USING (
    tenant_id = ANY(get_user_tenant_ids())
    OR EXISTS (
      SELECT 1 FROM agency_tenant_links atl
      WHERE atl.tenant_id = entities.tenant_id
        AND atl.agency_id = ANY(get_user_agency_ids())
        AND atl.status = 'active'
    )
  );

CREATE POLICY "entities_insert" ON entities
  FOR INSERT WITH CHECK (tenant_id = ANY(get_user_tenant_ids()));

CREATE POLICY "entities_update" ON entities
  FOR UPDATE USING (
    tenant_id = ANY(get_user_tenant_ids())
    OR EXISTS (
      SELECT 1 FROM agency_tenant_links atl
      WHERE atl.tenant_id = entities.tenant_id
        AND atl.agency_id = ANY(get_user_agency_ids())
        AND atl.status = 'active'
    )
  );

CREATE POLICY "entities_delete" ON entities
  FOR DELETE USING (tenant_id = ANY(get_user_tenant_ids()));

CREATE INDEX idx_entities_tenant ON entities(tenant_id);
CREATE INDEX idx_entities_kind ON entities(kind);
CREATE INDEX idx_entities_slug ON entities(slug);

CREATE TRIGGER set_entities_updated_at
  BEFORE UPDATE ON entities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- 2. ACCOMMODATIONS — estensione hospitality di entities
-- ============================================================================

CREATE TABLE accommodations (
  entity_id UUID PRIMARY KEY REFERENCES entities(id) ON DELETE CASCADE,
  property_type TEXT CHECK (property_type IN ('hotel', 'residence', 'mixed', 'b_and_b', 'agriturismo', 'apartment', 'affittacamere')),
  is_imprenditoriale BOOLEAN DEFAULT true,
  legal_name TEXT,
  vat_number TEXT,
  fiscal_code TEXT,
  rea_number TEXT,
  legal_details JSONB NOT NULL DEFAULT '{}'::jsonb,
  amenities JSONB DEFAULT '[]'::jsonb,
  address TEXT,
  city TEXT,
  province TEXT,
  zip TEXT,
  country TEXT DEFAULT 'IT',
  email TEXT,
  phone TEXT,
  pec TEXT,
  website TEXT,
  logo_url TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  region TEXT,
  default_check_in_time TIME DEFAULT '14:00',
  default_check_out_time TIME DEFAULT '10:00',
  default_currency TEXT DEFAULT 'EUR',
  default_language TEXT DEFAULT 'it',
  default_vat_rate DECIMAL(5,2) DEFAULT 10.00,
  timezone TEXT DEFAULT 'Europe/Rome',
  settings JSONB DEFAULT '{}'::jsonb
);

ALTER TABLE accommodations ENABLE ROW LEVEL SECURITY;

-- RLS: eredita da entities (check entity_id esiste in entities accessibili)
CREATE POLICY "accommodations_select" ON accommodations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM entities e WHERE e.id = entity_id AND (
      e.tenant_id = ANY(get_user_tenant_ids())
      OR EXISTS (
        SELECT 1 FROM agency_tenant_links atl
        WHERE atl.tenant_id = e.tenant_id
          AND atl.agency_id = ANY(get_user_agency_ids())
          AND atl.status = 'active'
      )
    ))
  );

CREATE POLICY "accommodations_insert" ON accommodations
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM entities e WHERE e.id = entity_id AND e.tenant_id = ANY(get_user_tenant_ids()))
  );

CREATE POLICY "accommodations_update" ON accommodations
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM entities e WHERE e.id = entity_id AND (
      e.tenant_id = ANY(get_user_tenant_ids())
      OR EXISTS (
        SELECT 1 FROM agency_tenant_links atl
        WHERE atl.tenant_id = e.tenant_id
          AND atl.agency_id = ANY(get_user_agency_ids())
          AND atl.status = 'active'
      )
    ))
  );

CREATE POLICY "accommodations_delete" ON accommodations
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM entities e WHERE e.id = entity_id AND e.tenant_id = ANY(get_user_tenant_ids()))
  );

-- ============================================================================
-- 3. ACTIVITIES — estensione experiences di entities (placeholder)
-- ============================================================================

CREATE TABLE activities (
  entity_id UUID PRIMARY KEY REFERENCES entities(id) ON DELETE CASCADE,
  activity_type TEXT,
  duration_minutes INTEGER,
  details JSONB DEFAULT '{}'::jsonb
);

ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activities_select" ON activities
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM entities e WHERE e.id = entity_id AND (
      e.tenant_id = ANY(get_user_tenant_ids())
      OR EXISTS (
        SELECT 1 FROM agency_tenant_links atl
        WHERE atl.tenant_id = e.tenant_id
          AND atl.agency_id = ANY(get_user_agency_ids())
          AND atl.status = 'active'
      )
    ))
  );

CREATE POLICY "activities_insert" ON activities
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM entities e WHERE e.id = entity_id AND e.tenant_id = ANY(get_user_tenant_ids()))
  );

CREATE POLICY "activities_update" ON activities
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM entities e WHERE e.id = entity_id AND (
      e.tenant_id = ANY(get_user_tenant_ids())
      OR EXISTS (
        SELECT 1 FROM agency_tenant_links atl
        WHERE atl.tenant_id = e.tenant_id
          AND atl.agency_id = ANY(get_user_agency_ids())
          AND atl.status = 'active'
      )
    ))
  );

CREATE POLICY "activities_delete" ON activities
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM entities e WHERE e.id = entity_id AND e.tenant_id = ANY(get_user_tenant_ids()))
  );

-- ============================================================================
-- 4. DATA MIGRATION: properties → entities + accommodations
-- Usa gli STESSI UUID per consentire FK repoint in 00029
-- ============================================================================

INSERT INTO entities (id, tenant_id, kind, slug, name, description, short_description, country_override, management_mode, is_active, created_at, updated_at)
SELECT
  id,
  tenant_id,
  'accommodation',
  slug,
  name,
  description,
  short_description,
  country_override,
  'self_service',
  is_active,
  created_at,
  updated_at
FROM properties;

INSERT INTO accommodations (entity_id, property_type, is_imprenditoriale, legal_name, vat_number, fiscal_code, rea_number, legal_details, amenities, address, city, province, zip, country, email, phone, pec, website, logo_url, latitude, longitude, region, default_check_in_time, default_check_out_time, default_currency, default_language, default_vat_rate, timezone, settings)
SELECT
  id,
  type,
  is_imprenditoriale,
  legal_name,
  vat_number,
  fiscal_code,
  rea_number,
  legal_details,
  amenities,
  address,
  city,
  province,
  zip,
  country,
  email,
  phone,
  pec,
  website,
  logo_url,
  latitude,
  longitude,
  region,
  default_check_in_time,
  default_check_out_time,
  default_currency,
  default_language,
  default_vat_rate,
  timezone,
  settings
FROM properties;

-- ============================================================================
-- 5. FUNZIONE NUOVA: get_user_entity_ids()
-- Per ora coesiste con get_user_property_ids(). Drop in 00029.
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_entity_ids()
RETURNS UUID[]
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(array_agg(e.id), ARRAY[]::UUID[])
  FROM entities e
  WHERE e.tenant_id = ANY(get_user_tenant_ids());
$$;

-- Policy pubblica per entities (booking engine, portali)
CREATE POLICY "entities_public_read_by_slug" ON entities
  FOR SELECT USING (slug IS NOT NULL AND is_active = true);
