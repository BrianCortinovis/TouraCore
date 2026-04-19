-- 00137: Core Web Vitals RUM metrics

CREATE TABLE IF NOT EXISTS core_web_vitals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  tenant_slug TEXT,
  route TEXT NOT NULL,
  metric_name TEXT NOT NULL CHECK (metric_name IN ('LCP', 'INP', 'CLS', 'FCP', 'TTFB', 'FID')),
  metric_value DOUBLE PRECISION NOT NULL,
  rating TEXT CHECK (rating IN ('good', 'needs-improvement', 'poor')),
  navigation_type TEXT,
  user_agent_family TEXT,
  device_type TEXT CHECK (device_type IN ('desktop', 'mobile', 'tablet', 'other')),
  country_code TEXT,
  connection_effective_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE core_web_vitals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cwv_insert_anon" ON core_web_vitals
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "cwv_insert_auth" ON core_web_vitals
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "cwv_select_admin" ON core_web_vitals
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid()
        AND (u.raw_app_meta_data->>'role') = 'super_admin'
    )
  );

CREATE INDEX idx_cwv_created ON core_web_vitals(created_at DESC);
CREATE INDEX idx_cwv_route_metric ON core_web_vitals(route, metric_name, created_at DESC);
CREATE INDEX idx_cwv_tenant ON core_web_vitals(tenant_slug) WHERE tenant_slug IS NOT NULL;

CREATE OR REPLACE VIEW core_web_vitals_p75 AS
SELECT
  route,
  metric_name,
  device_type,
  DATE_TRUNC('day', created_at) AS day,
  COUNT(*) AS sample_count,
  PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY metric_value) AS p75,
  PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY metric_value) AS p50,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY metric_value) AS p95
FROM core_web_vitals
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY route, metric_name, device_type, DATE_TRUNC('day', created_at);

COMMENT ON TABLE core_web_vitals IS 'RUM Core Web Vitals dal browser (gated behind analytics consent)';
