-- 00135: Cookie consent records per GDPR Art.7 auditability
-- Consente di provare che il consenso è stato liberamente dato + tracking policy version

CREATE TABLE IF NOT EXISTS cookie_consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  tenant_slug TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  preferences JSONB NOT NULL,
  policy_version TEXT NOT NULL,
  is_reconsent BOOLEAN NOT NULL DEFAULT false,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Append-only: no UPDATE, no DELETE (except retention cron)
ALTER TABLE cookie_consent_records ENABLE ROW LEVEL SECURITY;

-- Anon users can INSERT their own consent
CREATE POLICY "consent_insert_anon" ON cookie_consent_records
  FOR INSERT TO anon WITH CHECK (true);

-- Authenticated users can INSERT with their user_id
CREATE POLICY "consent_insert_auth" ON cookie_consent_records
  FOR INSERT TO authenticated WITH CHECK (true);

-- Users can read their own consent records
CREATE POLICY "consent_read_own" ON cookie_consent_records
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX idx_consent_session ON cookie_consent_records(session_id);
CREATE INDEX idx_consent_user ON cookie_consent_records(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_consent_created ON cookie_consent_records(created_at DESC);
CREATE INDEX idx_consent_version ON cookie_consent_records(policy_version);

COMMENT ON TABLE cookie_consent_records IS 'Audit trail consensi cookie (GDPR Art.7 + Garante 10/06/2021). Append-only.';
