-- 00062: Entity links (cross-module communication) + isolation mode
-- Dipende da: entities (00028)
-- Fase F1 — foundation multi-module

CREATE TABLE public.entity_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  from_entity_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  to_entity_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  link_type TEXT NOT NULL CHECK (link_type IN (
    'parent_child','partner','folio_bridge','shared_guest','cross_sell','upsell_package'
  )),
  config JSONB NOT NULL DEFAULT '{}',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (from_entity_id, to_entity_id, link_type),
  CHECK (from_entity_id <> to_entity_id)
);

CREATE INDEX idx_entity_links_from ON public.entity_links(from_entity_id) WHERE active = TRUE;
CREATE INDEX idx_entity_links_to ON public.entity_links(to_entity_id) WHERE active = TRUE;
CREATE INDEX idx_entity_links_tenant ON public.entity_links(tenant_id);
CREATE INDEX idx_entity_links_type ON public.entity_links(link_type);

ALTER TABLE public.entity_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "entity_links_select" ON public.entity_links
  FOR SELECT USING (
    tenant_id = ANY(get_user_tenant_ids())
    OR is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM public.agency_tenant_links atl
      WHERE atl.tenant_id = entity_links.tenant_id
        AND atl.agency_id = ANY(get_user_agency_ids())
        AND atl.status = 'active'
    )
  );

CREATE POLICY "entity_links_insert" ON public.entity_links
  FOR INSERT WITH CHECK (
    tenant_id = ANY(get_user_tenant_ids())
    OR is_platform_admin()
  );

CREATE POLICY "entity_links_update" ON public.entity_links
  FOR UPDATE USING (
    tenant_id = ANY(get_user_tenant_ids())
    OR is_platform_admin()
  );

CREATE POLICY "entity_links_delete" ON public.entity_links
  FOR DELETE USING (
    tenant_id = ANY(get_user_tenant_ids())
    OR is_platform_admin()
  );

CREATE TRIGGER set_entity_links_updated_at
  BEFORE UPDATE ON public.entity_links
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- Isolation mode su entities: none=default (share guest, etc), partial, strict
-- ============================================================================

ALTER TABLE public.entities
  ADD COLUMN IF NOT EXISTS isolation_mode TEXT NOT NULL DEFAULT 'none'
    CHECK (isolation_mode IN ('none','partial','strict'));
