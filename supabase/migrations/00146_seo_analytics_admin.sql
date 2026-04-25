-- 00146: tabelle admin per SEO + Analytics + redirects
-- Dipendenze: nessuna nuova; usa platform_admins per auth/RLS

-- 1) SEO settings globali (singleton tipo "_system_")
CREATE TABLE IF NOT EXISTS public.seo_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope TEXT NOT NULL UNIQUE CHECK (scope IN ('platform','tenant')),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,

  default_title_template TEXT,
  default_description TEXT,
  default_og_image_url TEXT,

  robots_txt_override TEXT,

  google_site_verification TEXT,
  bing_site_verification TEXT,

  ga4_measurement_id TEXT,
  ga4_api_secret TEXT,
  ga4_enabled BOOLEAN NOT NULL DEFAULT false,

  search_console_property TEXT,
  search_console_oauth_token JSONB,

  custom_head_tags TEXT,

  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_seo_settings_tenant ON public.seo_settings(tenant_id) WHERE tenant_id IS NOT NULL;

-- Singleton platform-level row
INSERT INTO public.seo_settings (scope, default_title_template, default_description, default_og_image_url, ga4_enabled)
VALUES ('platform', '%s — TouraCore', 'Piattaforma multi-verticale per il turismo italiano', '/opengraph-image', false)
ON CONFLICT (scope) DO NOTHING;

ALTER TABLE public.seo_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS seo_settings_platform_admin ON public.seo_settings;
CREATE POLICY seo_settings_platform_admin ON public.seo_settings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.platform_admins pa WHERE pa.user_id = auth.uid())
  );

-- Public read solo per tenant scope (per resolve runtime override)
DROP POLICY IF EXISTS seo_settings_public_read ON public.seo_settings;
CREATE POLICY seo_settings_public_read ON public.seo_settings
  FOR SELECT TO anon
  USING (scope = 'platform' OR (scope = 'tenant' AND tenant_id IS NOT NULL));


-- 2) Redirects manager (301/302)
CREATE TABLE IF NOT EXISTS public.platform_redirects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_path TEXT NOT NULL UNIQUE,
  target_path TEXT NOT NULL,
  redirect_type SMALLINT NOT NULL DEFAULT 301 CHECK (redirect_type IN (301, 302, 307, 308)),
  is_active BOOLEAN NOT NULL DEFAULT true,
  hit_count BIGINT NOT NULL DEFAULT 0,
  last_hit_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_redirects_active ON public.platform_redirects(source_path) WHERE is_active = true;

ALTER TABLE public.platform_redirects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS redirects_platform_admin ON public.platform_redirects;
CREATE POLICY redirects_platform_admin ON public.platform_redirects
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.platform_admins pa WHERE pa.user_id = auth.uid())
  );

DROP POLICY IF EXISTS redirects_anon_read ON public.platform_redirects;
CREATE POLICY redirects_anon_read ON public.platform_redirects
  FOR SELECT TO anon
  USING (is_active = true);


-- 3) 404 monitor (segna i path che ritornano 404 per spotting redirect mancanti)
CREATE TABLE IF NOT EXISTS public.platform_404_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path TEXT NOT NULL,
  referrer TEXT,
  user_agent TEXT,
  hit_count BIGINT NOT NULL DEFAULT 1,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolution_redirect_id UUID REFERENCES public.platform_redirects(id) ON DELETE SET NULL,
  UNIQUE(path)
);

CREATE INDEX IF NOT EXISTS idx_404_unresolved ON public.platform_404_log(last_seen_at DESC) WHERE resolved = false;

ALTER TABLE public.platform_404_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS log404_platform_admin ON public.platform_404_log;
CREATE POLICY log404_platform_admin ON public.platform_404_log
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.platform_admins pa WHERE pa.user_id = auth.uid())
  );


-- 4) Analytics events business custom (cross-vertical funnel)
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT,
  user_id UUID,
  tenant_slug TEXT,
  entity_slug TEXT,
  event_name TEXT NOT NULL,
  event_category TEXT NOT NULL CHECK (event_category IN ('page_view','booking_funnel','conversion','engagement','technical','error')),
  event_value NUMERIC,
  event_currency TEXT,
  properties JSONB NOT NULL DEFAULT '{}',
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  referrer TEXT,
  page_path TEXT,
  device_type TEXT,
  country_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON public.analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_name ON public.analytics_events(event_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_tenant ON public.analytics_events(tenant_slug, created_at DESC) WHERE tenant_slug IS NOT NULL;

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS analytics_platform_admin ON public.analytics_events;
CREATE POLICY analytics_platform_admin ON public.analytics_events
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.platform_admins pa WHERE pa.user_id = auth.uid())
  );

-- Insert anon (per tracking client-side via API)
DROP POLICY IF EXISTS analytics_anon_insert ON public.analytics_events;
CREATE POLICY analytics_anon_insert ON public.analytics_events
  FOR INSERT TO anon
  WITH CHECK (true);


-- 5) View aggregata vitals + traffic per dashboard
CREATE OR REPLACE VIEW public.platform_seo_kpi_daily AS
SELECT
  date_trunc('day', created_at)::date AS day,
  COUNT(*) FILTER (WHERE metric_name = 'LCP' AND rating = 'good') AS lcp_good,
  COUNT(*) FILTER (WHERE metric_name = 'LCP' AND rating = 'needs-improvement') AS lcp_meh,
  COUNT(*) FILTER (WHERE metric_name = 'LCP' AND rating = 'poor') AS lcp_poor,
  COUNT(*) FILTER (WHERE metric_name = 'CLS' AND rating = 'good') AS cls_good,
  COUNT(*) FILTER (WHERE metric_name = 'CLS' AND rating = 'poor') AS cls_poor,
  COUNT(*) FILTER (WHERE metric_name = 'INP' AND rating = 'good') AS inp_good,
  COUNT(*) FILTER (WHERE metric_name = 'INP' AND rating = 'poor') AS inp_poor,
  COUNT(DISTINCT session_id) AS sessions,
  COUNT(DISTINCT route) AS routes_visited
FROM public.core_web_vitals
WHERE created_at >= NOW() - INTERVAL '90 days'
GROUP BY day
ORDER BY day DESC;

GRANT SELECT ON public.platform_seo_kpi_daily TO authenticated;


-- 6) View top routes con vitals problematici
CREATE OR REPLACE VIEW public.platform_seo_routes_problems AS
SELECT
  route,
  COUNT(*) AS samples,
  ROUND(AVG(metric_value)::numeric, 0) AS avg_lcp,
  ROUND(percentile_cont(0.75) WITHIN GROUP (ORDER BY metric_value)::numeric, 0) AS p75_lcp,
  COUNT(*) FILTER (WHERE rating = 'poor') AS poor_count
FROM public.core_web_vitals
WHERE metric_name = 'LCP'
  AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY route
HAVING COUNT(*) FILTER (WHERE rating = 'poor') > 0
ORDER BY poor_count DESC, p75_lcp DESC
LIMIT 50;

GRANT SELECT ON public.platform_seo_routes_problems TO authenticated;


COMMENT ON TABLE public.seo_settings IS 'SEO config singleton platform + override per tenant (M00146)';
COMMENT ON TABLE public.platform_redirects IS 'Redirect manager 301/302 amministrato da SuperAdmin (M00146)';
COMMENT ON TABLE public.platform_404_log IS 'Log path che restituiscono 404 per spotting redirect mancanti (M00146)';
COMMENT ON TABLE public.analytics_events IS 'Eventi business custom (booking funnel, conversion, engagement) — alternativa/complemento a GA4 (M00146)';
