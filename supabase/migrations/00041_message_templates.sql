-- 00041: Template messaggi e storico invii
-- Dipende da: 00028 (entities), 00033 (guests), 00016 (bookings)

-- ============================================================================
-- 1. TABELLA TEMPLATE MESSAGGI
-- ============================================================================

CREATE TABLE message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  trigger TEXT NOT NULL CHECK (trigger IN (
    'booking_confirmed', 'booking_cancelled', 'pre_arrival',
    'check_in', 'check_out', 'post_stay', 'birthday',
    'manual', 'quote_sent', 'payment_reminder'
  )),
  channel TEXT NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'whatsapp', 'sms')),
  subject TEXT,
  body_html TEXT,
  body_text TEXT,
  variables TEXT[] DEFAULT '{}',
  send_days_offset INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mt_select" ON message_templates FOR SELECT USING (entity_id = ANY(get_user_entity_ids()));
CREATE POLICY "mt_insert" ON message_templates FOR INSERT WITH CHECK (entity_id = ANY(get_user_entity_ids()));
CREATE POLICY "mt_update" ON message_templates FOR UPDATE USING (entity_id = ANY(get_user_entity_ids()));
CREATE POLICY "mt_delete" ON message_templates FOR DELETE USING (entity_id = ANY(get_user_entity_ids()));

CREATE INDEX idx_mt_entity ON message_templates(entity_id);
CREATE INDEX idx_mt_trigger ON message_templates(entity_id, trigger);

CREATE TRIGGER set_mt_updated_at
  BEFORE UPDATE ON message_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- 2. TABELLA MESSAGGI INVIATI
-- ============================================================================

CREATE TABLE sent_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  template_id UUID REFERENCES message_templates(id) ON DELETE SET NULL,
  reservation_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  guest_id UUID REFERENCES guests(id) ON DELETE SET NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'whatsapp', 'sms')),
  recipient TEXT NOT NULL,
  subject TEXT,
  body TEXT,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'delivered', 'opened', 'failed', 'bounced')),
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  error_message TEXT,
  external_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE sent_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sm_select" ON sent_messages FOR SELECT USING (entity_id = ANY(get_user_entity_ids()));
CREATE POLICY "sm_insert" ON sent_messages FOR INSERT WITH CHECK (entity_id = ANY(get_user_entity_ids()));
CREATE POLICY "sm_update" ON sent_messages FOR UPDATE USING (entity_id = ANY(get_user_entity_ids()));

CREATE INDEX idx_sm_entity ON sent_messages(entity_id);
CREATE INDEX idx_sm_template ON sent_messages(template_id);
CREATE INDEX idx_sm_guest ON sent_messages(guest_id);
CREATE INDEX idx_sm_reservation ON sent_messages(reservation_id);
CREATE INDEX idx_sm_status ON sent_messages(entity_id, status);
CREATE INDEX idx_sm_sent ON sent_messages(entity_id, sent_at DESC);
