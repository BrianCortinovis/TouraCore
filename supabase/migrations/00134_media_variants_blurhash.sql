-- 00134: Extend media table with variants + blurhash for pro photo pipeline
-- Dipende da: 00014 media

ALTER TABLE media
  ADD COLUMN IF NOT EXISTS blurhash TEXT,
  ADD COLUMN IF NOT EXISTS variants JSONB;

COMMENT ON COLUMN media.blurhash IS 'BlurHash string for progressive loading placeholder (32 chars typical)';
COMMENT ON COLUMN media.variants IS 'Responsive variant set: {tier: {format: {url,format,width,height,size_bytes}}}';

CREATE INDEX IF NOT EXISTS idx_media_variants ON media USING GIN (variants);
