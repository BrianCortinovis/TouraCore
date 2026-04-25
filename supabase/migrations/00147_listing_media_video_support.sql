-- 00147: Video support for listing_media (YouTube/Vimeo embed links)
--
-- Additive migration — non rompe dati esistenti.
--
-- Cambia:
--  A) media: nuove colonne video_platform / video_id / video_thumbnail_url
--     (NULL per foto). mime_type può essere 'video/youtube' o 'video/vimeo'.
--  B) listing_media: nuova colonna media_kind ('photo'|'video') con default 'photo'.
--  C) public_listing_photos_view: estende con media_kind + video_*.
--     Nome view invariato (backward compat con codice già esistente).
--  D) Vincolo CHECK: se media_kind='video' allora media.video_id NOT NULL.
--
-- Backfill: nessuno necessario, default coprono righe esistenti.
--
-- Dipendenze codice da aggiornare dopo apply:
--  - apps/web/src/app/(app)/[tenantSlug]/settings/gallery/[entityId]/actions.ts
--    (loadGalleryStateAction deve leggere media_kind + video_*)
--  - packages/core/listings/src/gallery.tsx (nuova MediaGallery v2)
--  - apps/web/src/app/s/[tenantSlug]/[entitySlug]/page.tsx (fetcher)
--  - getListingPhotosCached helper (cache key invariata)

-- ── A) media: video metadata ──────────────────────────────────────────
ALTER TABLE public.media
  ADD COLUMN IF NOT EXISTS video_platform TEXT
    CHECK (video_platform IS NULL OR video_platform IN ('youtube', 'vimeo'));

ALTER TABLE public.media
  ADD COLUMN IF NOT EXISTS video_id TEXT;

ALTER TABLE public.media
  ADD COLUMN IF NOT EXISTS video_thumbnail_url TEXT;

ALTER TABLE public.media
  ADD COLUMN IF NOT EXISTS video_title TEXT;

-- Coerenza: se video_platform è settato deve esserci anche video_id
ALTER TABLE public.media
  DROP CONSTRAINT IF EXISTS media_video_consistency;
ALTER TABLE public.media
  ADD CONSTRAINT media_video_consistency
  CHECK (
    (video_platform IS NULL AND video_id IS NULL)
    OR (video_platform IS NOT NULL AND video_id IS NOT NULL)
  );

-- ── B) listing_media: distinzione foto/video ──────────────────────────
ALTER TABLE public.listing_media
  ADD COLUMN IF NOT EXISTS media_kind TEXT NOT NULL DEFAULT 'photo'
    CHECK (media_kind IN ('photo', 'video'));

CREATE INDEX IF NOT EXISTS idx_listing_media_kind
  ON public.listing_media(listing_id, media_kind, sort_order);

-- ── C) Public view estesa ─────────────────────────────────────────────
-- Drop+create perché cambia ordine colonne (CREATE OR REPLACE non lo permette).
DROP VIEW IF EXISTS public.public_listing_photos_view;
CREATE VIEW public.public_listing_photos_view
WITH (security_invoker = false) AS
SELECT
  lm.id,
  lm.listing_id,
  pl.entity_id,
  pl.tenant_id,
  lm.sort_order,
  lm.is_hero,
  lm.caption,
  lm.media_kind,
  m.url,
  m.alt_text,
  m.width,
  m.height,
  m.video_platform,
  m.video_id,
  m.video_thumbnail_url,
  m.video_title
FROM public.listing_media lm
JOIN public.public_listings pl ON pl.id = lm.listing_id AND pl.is_public = true
JOIN public.media m ON m.id = lm.media_id
ORDER BY lm.sort_order ASC;

GRANT SELECT ON public.public_listing_photos_view TO anon, authenticated;

COMMENT ON COLUMN public.listing_media.media_kind IS
  'photo: media.url è immagine R2. video: media.video_platform/video_id puntano a YouTube/Vimeo, video_thumbnail_url è poster.';

COMMENT ON COLUMN public.media.video_platform IS
  'NULL per foto. youtube/vimeo per video link (nessun upload binario, solo embed).';
