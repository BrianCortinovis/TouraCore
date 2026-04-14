-- 00036: Channel Manager — connessioni OTA, mappature, log sync
-- Dipende da: 00028 (entities_tables), 00007 (rooms, room_types)

-- ============================================================================
-- 1. CONNESSIONI CANALE
-- ============================================================================

CREATE TABLE channel_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  channel_name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  credentials JSONB NOT NULL DEFAULT '{}'::jsonb,
  property_id_external TEXT,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(entity_id, channel_name)
);

-- ============================================================================
-- 2. MAPPATURE CAMERE/TARIFFE → CANALE
-- ============================================================================

CREATE TABLE channel_room_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_connection_id UUID NOT NULL REFERENCES channel_connections(id) ON DELETE CASCADE,
  room_type_id UUID NOT NULL REFERENCES room_types(id) ON DELETE CASCADE,
  rate_plan_id UUID REFERENCES rate_plans(id) ON DELETE SET NULL,
  external_room_id TEXT NOT NULL,
  external_rate_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 3. LOG SINCRONIZZAZIONI
-- ============================================================================

CREATE TABLE channel_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  channel_connection_id UUID NOT NULL REFERENCES channel_connections(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  status TEXT NOT NULL CHECK (status IN ('success', 'partial', 'error')),
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 4. COMMISSIONI PER CANALE
-- ============================================================================

CREATE TABLE channel_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  commission_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(entity_id, channel)
);

-- ============================================================================
-- 5. INDICI
-- ============================================================================

CREATE INDEX idx_channel_connections_entity ON channel_connections(entity_id);
CREATE INDEX idx_channel_room_mappings_connection ON channel_room_mappings(channel_connection_id);
CREATE INDEX idx_channel_sync_logs_entity ON channel_sync_logs(entity_id);
CREATE INDEX idx_channel_sync_logs_synced ON channel_sync_logs(synced_at DESC);
CREATE INDEX idx_channel_commissions_entity ON channel_commissions(entity_id);

-- ============================================================================
-- 6. RLS — entity-scoped
-- ============================================================================

ALTER TABLE channel_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_room_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_commissions ENABLE ROW LEVEL SECURITY;

-- channel_connections
CREATE POLICY "cc_select" ON channel_connections FOR SELECT USING (entity_id = ANY(get_user_entity_ids()));
CREATE POLICY "cc_insert" ON channel_connections FOR INSERT WITH CHECK (entity_id = ANY(get_user_entity_ids()));
CREATE POLICY "cc_update" ON channel_connections FOR UPDATE USING (entity_id = ANY(get_user_entity_ids()));
CREATE POLICY "cc_delete" ON channel_connections FOR DELETE USING (entity_id = ANY(get_user_entity_ids()));

-- channel_room_mappings (via connection ownership)
CREATE POLICY "crm_select" ON channel_room_mappings FOR SELECT USING (
  channel_connection_id IN (SELECT id FROM channel_connections WHERE entity_id = ANY(get_user_entity_ids()))
);
CREATE POLICY "crm_insert" ON channel_room_mappings FOR INSERT WITH CHECK (
  channel_connection_id IN (SELECT id FROM channel_connections WHERE entity_id = ANY(get_user_entity_ids()))
);
CREATE POLICY "crm_update" ON channel_room_mappings FOR UPDATE USING (
  channel_connection_id IN (SELECT id FROM channel_connections WHERE entity_id = ANY(get_user_entity_ids()))
);
CREATE POLICY "crm_delete" ON channel_room_mappings FOR DELETE USING (
  channel_connection_id IN (SELECT id FROM channel_connections WHERE entity_id = ANY(get_user_entity_ids()))
);

-- channel_sync_logs
CREATE POLICY "csl_select" ON channel_sync_logs FOR SELECT USING (entity_id = ANY(get_user_entity_ids()));
CREATE POLICY "csl_insert" ON channel_sync_logs FOR INSERT WITH CHECK (entity_id = ANY(get_user_entity_ids()));

-- channel_commissions
CREATE POLICY "cco_select" ON channel_commissions FOR SELECT USING (entity_id = ANY(get_user_entity_ids()));
CREATE POLICY "cco_insert" ON channel_commissions FOR INSERT WITH CHECK (entity_id = ANY(get_user_entity_ids()));
CREATE POLICY "cco_update" ON channel_commissions FOR UPDATE USING (entity_id = ANY(get_user_entity_ids()));
CREATE POLICY "cco_delete" ON channel_commissions FOR DELETE USING (entity_id = ANY(get_user_entity_ids()));
