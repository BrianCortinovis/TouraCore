-- 00141: Tenant branding media (logo, cover, brand color)
--
-- Aggiunge logo_media_id, cover_media_id, brand_color a tenants per
-- personalizzazione widget booking, profilo pubblico tenant e listing pages.
-- Crea view anon-safe public_tenant_branding_view per /book/multi/[slug].
--
-- Note:
-- - additivo: nessun campo NOT NULL, nessun backfill richiesto
-- - FK ON DELETE SET NULL: cancellare media non rompe tenant
-- - vista anon esposta filtra solo tenants attivi

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS logo_media_id UUID REFERENCES public.media(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cover_media_id UUID REFERENCES public.media(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS brand_color TEXT;

COMMENT ON COLUMN public.tenants.logo_media_id IS 'Logo brand tenant (mostrato su /book/multi e listings).';
COMMENT ON COLUMN public.tenants.cover_media_id IS 'Cover/hero image profilo tenant (header pagina booking).';
COMMENT ON COLUMN public.tenants.brand_color IS 'Hex color primario brand (es. #003b95). Usato per CTA e accenti.';

-- Vista anon-safe: solo tenant attivi, solo URL e brand_color
CREATE OR REPLACE VIEW public.public_tenant_branding_view
WITH (security_invoker = false) AS
SELECT
  t.id          AS tenant_id,
  t.slug        AS tenant_slug,
  t.name        AS tenant_name,
  t.brand_color,
  logo.url      AS logo_url,
  logo.alt_text AS logo_alt,
  cover.url     AS cover_url,
  cover.alt_text AS cover_alt
FROM public.tenants t
LEFT JOIN public.media logo  ON logo.id  = t.logo_media_id
LEFT JOIN public.media cover ON cover.id = t.cover_media_id
WHERE t.is_active = true;

GRANT SELECT ON public.public_tenant_branding_view TO anon, authenticated;
