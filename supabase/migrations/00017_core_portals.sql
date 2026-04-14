-- 00017: Tabelle portali territoriali
-- Dipende da: tenants (00002), agencies (00012), get_user_tenant_ids() (00001)

CREATE TABLE portals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  domain TEXT,
  agency_id UUID REFERENCES agencies(id) ON DELETE SET NULL,
  settings JSONB DEFAULT '{}'::jsonb,
  seo JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE portals ENABLE ROW LEVEL SECURITY;

-- Portali pubblici leggibili da tutti (per pagine pubbliche)
CREATE POLICY "portals_select_public" ON portals
  FOR SELECT USING (status = 'active');

-- Gestione portali: solo chi ha accesso all'agenzia proprietaria
CREATE POLICY "portals_select_agency" ON portals
  FOR SELECT USING (
    agency_id IS NOT NULL AND agency_id IN (
      SELECT agency_id FROM agency_memberships WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "portals_insert" ON portals
  FOR INSERT WITH CHECK (
    agency_id IS NULL OR agency_id IN (
      SELECT agency_id FROM agency_memberships WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "portals_update" ON portals
  FOR UPDATE USING (
    agency_id IS NULL OR agency_id IN (
      SELECT agency_id FROM agency_memberships WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "portals_delete" ON portals
  FOR DELETE USING (
    agency_id IS NULL OR agency_id IN (
      SELECT agency_id FROM agency_memberships WHERE user_id = auth.uid()
    )
  );

CREATE INDEX idx_portals_slug ON portals(slug);
CREATE INDEX idx_portals_agency ON portals(agency_id);
CREATE INDEX idx_portals_status ON portals(status);

CREATE TRIGGER set_portals_updated_at
  BEFORE UPDATE ON portals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Associazione portale-tenant
CREATE TABLE portal_tenants (
  portal_id UUID NOT NULL REFERENCES portals(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  featured BOOLEAN DEFAULT false,
  PRIMARY KEY (portal_id, tenant_id)
);

ALTER TABLE portal_tenants ENABLE ROW LEVEL SECURITY;

-- Leggibile se il portale è attivo
CREATE POLICY "portal_tenants_select" ON portal_tenants
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM portals WHERE id = portal_id AND status = 'active')
  );

-- Gestione: chi ha accesso all'agenzia del portale
CREATE POLICY "portal_tenants_insert" ON portal_tenants
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM portals p
      JOIN agency_memberships am ON am.agency_id = p.agency_id
      WHERE p.id = portal_id AND am.user_id = auth.uid()
    )
  );

CREATE POLICY "portal_tenants_update" ON portal_tenants
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM portals p
      JOIN agency_memberships am ON am.agency_id = p.agency_id
      WHERE p.id = portal_id AND am.user_id = auth.uid()
    )
  );

CREATE POLICY "portal_tenants_delete" ON portal_tenants
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM portals p
      JOIN agency_memberships am ON am.agency_id = p.agency_id
      WHERE p.id = portal_id AND am.user_id = auth.uid()
    )
  );

CREATE INDEX idx_portal_tenants_portal ON portal_tenants(portal_id);
CREATE INDEX idx_portal_tenants_tenant ON portal_tenants(tenant_id);

-- Aggiungere FK bookings → portals (ora che portals esiste)
ALTER TABLE bookings
  ADD CONSTRAINT bookings_portal_fk
  FOREIGN KEY (portal_id) REFERENCES portals(id) ON DELETE SET NULL;
