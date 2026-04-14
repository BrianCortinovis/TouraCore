-- 00014: Tabella media — file upload con isolamento per tenant
-- Dipende da: tenants (00002), get_user_tenant_ids() (00001)

CREATE TABLE media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  r2_key TEXT NOT NULL UNIQUE,
  r2_bucket TEXT NOT NULL,
  url TEXT NOT NULL,
  alt_text TEXT,
  width INTEGER,
  height INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "media_select" ON media
  FOR SELECT USING (tenant_id = ANY(get_user_tenant_ids()));

CREATE POLICY "media_insert" ON media
  FOR INSERT WITH CHECK (tenant_id = ANY(get_user_tenant_ids()));

CREATE POLICY "media_update" ON media
  FOR UPDATE USING (tenant_id = ANY(get_user_tenant_ids()));

CREATE POLICY "media_delete" ON media
  FOR DELETE USING (tenant_id = ANY(get_user_tenant_ids()));

CREATE INDEX idx_media_tenant ON media(tenant_id);
CREATE INDEX idx_media_created ON media(created_at DESC);
CREATE INDEX idx_media_mime ON media(mime_type);
CREATE INDEX idx_media_r2_key ON media(r2_key);
