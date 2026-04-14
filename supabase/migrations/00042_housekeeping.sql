-- 00042: Housekeeping task — pulizie e manutenzione camere
-- Dipende da: 00028 (entities), 00007 (rooms), 00013 (staff_members)

-- ============================================================================
-- 1. TABELLA TASK HOUSEKEEPING
-- ============================================================================

CREATE TABLE housekeeping_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  task_date DATE NOT NULL DEFAULT CURRENT_DATE,
  task_type TEXT NOT NULL CHECK (task_type IN (
    'checkout_clean', 'stay_clean', 'deep_clean', 'turndown', 'maintenance', 'inspection'
  )),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'in_progress', 'completed', 'inspected', 'skipped'
  )),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  assigned_to UUID REFERENCES staff_members(id) ON DELETE SET NULL,
  checklist JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  maintenance_issue TEXT,
  photos TEXT[] DEFAULT '{}',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  inspected_by UUID REFERENCES staff_members(id) ON DELETE SET NULL,
  inspected_at TIMESTAMPTZ,
  inspection_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE housekeeping_tasks ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. RLS — entity-scoped
-- ============================================================================

CREATE POLICY "hk_select" ON housekeeping_tasks FOR SELECT USING (entity_id = ANY(get_user_entity_ids()));
CREATE POLICY "hk_insert" ON housekeeping_tasks FOR INSERT WITH CHECK (entity_id = ANY(get_user_entity_ids()));
CREATE POLICY "hk_update" ON housekeeping_tasks FOR UPDATE USING (entity_id = ANY(get_user_entity_ids()));
CREATE POLICY "hk_delete" ON housekeeping_tasks FOR DELETE USING (entity_id = ANY(get_user_entity_ids()));

-- ============================================================================
-- 3. INDICI
-- ============================================================================

CREATE INDEX idx_hk_entity_date ON housekeeping_tasks(entity_id, task_date);
CREATE INDEX idx_hk_room ON housekeeping_tasks(room_id);
CREATE INDEX idx_hk_status ON housekeeping_tasks(entity_id, status);
CREATE INDEX idx_hk_assigned ON housekeeping_tasks(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX idx_hk_type ON housekeeping_tasks(entity_id, task_type);

CREATE TRIGGER set_hk_updated_at
  BEFORE UPDATE ON housekeeping_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
