-- 00027: Multi-vertical + Agency layer + Audit esteso
-- Dipende da: agencies (00012), audit_logs (00005), tenants (00002)
-- Fase T01 — solo modifiche additive, zero distruzione
-- Backup cloud: .gsd/backups/cloud_pre_00027_*.sql

-- ============================================================================
-- 1. SLUG SU AGENCIES (unico campo mancante per routing)
-- ============================================================================

-- Backfill prima di NOT NULL: genera slug da name per righe esistenti
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS slug TEXT;

UPDATE agencies
SET slug = LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || SUBSTR(gen_random_uuid()::TEXT, 1, 6)
WHERE slug IS NULL;

ALTER TABLE agencies ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_agencies_slug ON agencies(slug);

-- ============================================================================
-- 2. AGENCY_ROLE: aggiungere ruolo intermedio agency_admin
-- ============================================================================

ALTER TYPE agency_role ADD VALUE IF NOT EXISTS 'agency_admin';

-- ============================================================================
-- 3. AGENCY_TENANT_LINKS — relazione ricca agenzia↔tenant
-- tenants.agency_id resta come shortcut denormalizzato (primary agency)
-- ============================================================================

CREATE TABLE agency_tenant_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'manager',
  default_management_mode TEXT NOT NULL DEFAULT 'self_service'
    CHECK (default_management_mode IN ('agency_managed', 'self_service')),
  billing_mode TEXT NOT NULL DEFAULT 'client_direct'
    CHECK (billing_mode IN ('client_direct', 'agency_covered')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'revoked')),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  UNIQUE (agency_id, tenant_id)
);

ALTER TABLE agency_tenant_links ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_agency_tenant_links_tenant ON agency_tenant_links(tenant_id);
CREATE INDEX idx_agency_tenant_links_agency ON agency_tenant_links(agency_id);

-- Policy: membro agency vede i link della propria agency
CREATE POLICY "agency_tenant_links_select_agency" ON agency_tenant_links
  FOR SELECT USING (agency_id = ANY(get_user_agency_ids()));

-- Policy: membro tenant vede i link del proprio tenant
CREATE POLICY "agency_tenant_links_select_tenant" ON agency_tenant_links
  FOR SELECT USING (tenant_id = ANY(get_user_tenant_ids()));

-- INSERT/UPDATE/DELETE: solo agency member
CREATE POLICY "agency_tenant_links_insert" ON agency_tenant_links
  FOR INSERT WITH CHECK (agency_id = ANY(get_user_agency_ids()));

CREATE POLICY "agency_tenant_links_update" ON agency_tenant_links
  FOR UPDATE USING (agency_id = ANY(get_user_agency_ids()));

CREATE POLICY "agency_tenant_links_delete" ON agency_tenant_links
  FOR DELETE USING (agency_id = ANY(get_user_agency_ids()));

-- ============================================================================
-- 4. AUDIT_LOGS: via_agency_id per tracciare azioni fatte tramite agenzia
-- ============================================================================

ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS via_agency_id UUID REFERENCES agencies(id);
CREATE INDEX IF NOT EXISTS idx_audit_agency ON audit_logs(via_agency_id) WHERE via_agency_id IS NOT NULL;

-- Policy aggiuntiva: utente agency vede righe audit con via_agency_id = propria agency
CREATE POLICY "audit_logs_select_agency" ON audit_logs
  FOR SELECT USING (via_agency_id = ANY(get_user_agency_ids()));

-- ============================================================================
-- 5. TENANTS: moduli multi-vertical + billing_customer_id placeholder
-- ============================================================================

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS modules JSONB NOT NULL DEFAULT '{"hospitality": true, "experiences": false}';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS billing_customer_id TEXT;

-- ============================================================================
-- 6. Trigger updated_at per agency_tenant_links
-- ============================================================================

-- Colonna updated_at per agency_tenant_links (serve al trigger)
-- Non la aggiunge se non la usiamo nel modello, ma è buona pratica per audit
-- Decido di non aggiungerla: il modello ha invited_at/accepted_at/revoked_at come timestamp.
-- L'updated_at generico non serve qui.
