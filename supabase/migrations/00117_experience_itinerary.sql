-- 00117: Multi-day tour itinerary steps
-- Modulo: Experience M064

CREATE TABLE public.experience_itinerary_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.experience_products(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  step_number INT NOT NULL CHECK (step_number > 0),
  day_number INT NOT NULL DEFAULT 1 CHECK (day_number > 0),
  start_offset_minutes INT NOT NULL DEFAULT 0,
  duration_minutes INT,
  title TEXT NOT NULL,
  description_md TEXT,
  location_name TEXT,
  latitude NUMERIC(9,6),
  longitude NUMERIC(9,6),
  step_type TEXT NOT NULL CHECK (step_type IN ('meeting','transfer','activity','meal','break','accommodation','dropoff','other')),
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (product_id, step_number)
);
CREATE INDEX idx_eis_product ON public.experience_itinerary_steps(product_id, day_number, step_number);

ALTER TABLE public.experience_itinerary_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "eis_all" ON public.experience_itinerary_steps FOR ALL USING (
  tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin()
) WITH CHECK (tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin());
CREATE TRIGGER set_eis_updated_at BEFORE UPDATE ON public.experience_itinerary_steps FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Extend experience_products with tour metadata
ALTER TABLE public.experience_products ADD COLUMN IF NOT EXISTS days_count INT NOT NULL DEFAULT 1 CHECK (days_count > 0);
ALTER TABLE public.experience_products ADD COLUMN IF NOT EXISTS tour_type TEXT CHECK (tour_type IS NULL OR tour_type IN ('day_trip','multi_day','open_ended'));
