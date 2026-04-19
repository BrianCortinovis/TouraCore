-- 00136: DSAR compliance + data retention policy per GDPR Art.15-17 + legge IT 10y fatture

-- Soft delete tracking in shadow table (auth.users is Supabase-managed)
CREATE TABLE IF NOT EXISTS user_deletion_requests (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  scheduled_hard_delete_at TIMESTAMPTZ NOT NULL,
  ip_address INET,
  user_agent TEXT,
  canceled_at TIMESTAMPTZ,
  hard_deleted_at TIMESTAMPTZ
);

ALTER TABLE user_deletion_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deletion_select_own" ON user_deletion_requests
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "deletion_insert_own" ON user_deletion_requests
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_deletion_scheduled ON user_deletion_requests(scheduled_hard_delete_at) WHERE hard_deleted_at IS NULL AND canceled_at IS NULL;

-- Retention policy registry: TTL per tabella con legal basis
CREATE TABLE IF NOT EXISTS data_retention_policy (
  table_name TEXT PRIMARY KEY,
  ttl_days INTEGER NOT NULL CHECK (ttl_days >= 0),
  legal_basis TEXT NOT NULL,
  soft_delete_column TEXT,
  hard_delete_column TEXT DEFAULT 'created_at',
  exception_reason TEXT,
  last_purge_at TIMESTAMPTZ,
  rows_purged_last BIGINT DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE data_retention_policy ENABLE ROW LEVEL SECURITY;

-- Only platform_admin (super_admin role) can read/write
CREATE POLICY "retention_policy_admin" ON data_retention_policy
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid()
        AND (u.raw_app_meta_data->>'role') = 'super_admin'
    )
  );

-- Seed default retention policies
INSERT INTO data_retention_policy (table_name, ttl_days, legal_basis, hard_delete_column, exception_reason)
VALUES
  ('cookie_consent_records', 730, 'GDPR Art.7 — 2y auditability', 'created_at', NULL),
  ('audit_logs', 365, 'Security + fraud detection legitimate interest', 'created_at', NULL),
  ('agency_audit_logs', 365, 'GDPR Art.30 records of processing', 'created_at', NULL),
  ('magic_links', 7, 'Auth flow transitory', 'created_at', NULL),
  ('api_rate_limits', 1, 'Security ephemeral', 'created_at', NULL),
  ('core_web_vitals', 90, 'Performance monitoring', 'created_at', NULL),
  ('checkout_tokens', 7, 'Booking transient', 'created_at', NULL),
  ('notification_deliveries', 180, 'Delivery audit', 'created_at', NULL),
  ('cookie_consent_records_reconsent', 730, 'Part of cookie_consent_records', 'created_at', NULL),
  ('documents', 3650, 'Legge IT DPR 917/1986 art.22 — 10y conservazione fiscale', 'created_at', 'ITALIAN_FISCAL_RETENTION_10Y'),
  ('reservations', 3650, 'Legge IT fatture correlate — 10y', 'created_at', 'LINKED_TO_FISCAL_DOCUMENTS'),
  ('payments', 3650, 'Legge IT antiriciclaggio + fisco', 'created_at', 'ANTI_MONEY_LAUNDERING')
ON CONFLICT (table_name) DO NOTHING;

-- DSAR request audit table
CREATE TABLE IF NOT EXISTS dsar_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  request_type TEXT NOT NULL CHECK (request_type IN ('export', 'delete', 'rectify', 'restrict', 'portability', 'revoke_consent')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'rejected')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  ip_address INET,
  user_agent TEXT,
  request_payload JSONB,
  response_url TEXT,
  error_reason TEXT
);

ALTER TABLE dsar_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dsar_select_own" ON dsar_requests
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "dsar_insert_own" ON dsar_requests
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_dsar_user ON dsar_requests(user_id);
CREATE INDEX idx_dsar_status ON dsar_requests(status);
CREATE INDEX idx_dsar_type_created ON dsar_requests(request_type, requested_at DESC);

COMMENT ON TABLE data_retention_policy IS 'GDPR Art.5(1)(e) storage limitation — TTL per tabella con legal basis + eccezioni fiscali IT 10y';
COMMENT ON TABLE dsar_requests IS 'GDPR Art.15-22 data subject rights requests audit trail';
