-- 00094: Bikes per-serial fleet + e-bike specifics
-- Dipende da: 00093 (bike_rentals + bike_locations + get_user_bike_rental_ids)
-- Modulo: Bike Rental M038/S02

CREATE TABLE public.bikes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bike_rental_id UUID NOT NULL REFERENCES public.bike_rentals(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.bike_locations(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  bike_type TEXT NOT NULL CHECK (bike_type IN (
    'road','gravel','mtb','e_mtb','e_city','e_cargo','e_folding',
    'hybrid','folding','kids','tandem','handbike','cargo','city'
  )),
  brand TEXT,
  model TEXT,
  model_year INT CHECK (model_year IS NULL OR model_year BETWEEN 1990 AND 2100),
  serial_number TEXT,
  frame_size TEXT,
  wheel_size TEXT,
  color TEXT,
  purchase_price NUMERIC(10,2) CHECK (purchase_price IS NULL OR purchase_price >= 0),
  purchase_date DATE,
  insurance_value NUMERIC(10,2) CHECK (insurance_value IS NULL OR insurance_value >= 0),
  -- E-bike specific (nullable se non elettrica)
  is_electric BOOLEAN NOT NULL DEFAULT FALSE,
  battery_capacity_wh INT CHECK (battery_capacity_wh IS NULL OR battery_capacity_wh > 0),
  battery_cycles INT NOT NULL DEFAULT 0 CHECK (battery_cycles >= 0),
  battery_health_pct INT NOT NULL DEFAULT 100 CHECK (battery_health_pct BETWEEN 0 AND 100),
  last_charge_pct INT CHECK (last_charge_pct IS NULL OR last_charge_pct BETWEEN 0 AND 100),
  last_charged_at TIMESTAMPTZ,
  motor_brand TEXT,
  -- Status + condition
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN (
    'available','rented','maintenance','damaged','charging','retired','lost'
  )),
  condition_grade TEXT NOT NULL DEFAULT 'A' CHECK (condition_grade IN ('A','B','C','D')),
  total_km NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (total_km >= 0),
  last_maintenance_at TIMESTAMPTZ,
  next_maintenance_at TIMESTAMPTZ,
  maintenance_notes TEXT,
  gps_device_id TEXT,
  photos TEXT[] NOT NULL DEFAULT '{}',
  qr_code TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Constraints
  CONSTRAINT bikes_serial_unique_per_rental UNIQUE (bike_rental_id, serial_number),
  CONSTRAINT bikes_qr_unique UNIQUE (qr_code),
  CONSTRAINT bikes_ebike_consistency CHECK (
    is_electric = TRUE OR (battery_capacity_wh IS NULL AND motor_brand IS NULL)
  )
);

CREATE INDEX idx_bikes_rental ON public.bikes(bike_rental_id);
CREATE INDEX idx_bikes_tenant ON public.bikes(tenant_id);
CREATE INDEX idx_bikes_location ON public.bikes(location_id) WHERE location_id IS NOT NULL;
CREATE INDEX idx_bikes_status ON public.bikes(bike_rental_id, status);
CREATE INDEX idx_bikes_type ON public.bikes(bike_rental_id, bike_type);
CREATE INDEX idx_bikes_next_maintenance ON public.bikes(next_maintenance_at) WHERE next_maintenance_at IS NOT NULL;

ALTER TABLE public.bikes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bikes_select" ON public.bikes
  FOR SELECT USING (
    tenant_id = ANY(get_user_tenant_ids())
    OR is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM public.agency_tenant_links atl
      WHERE atl.tenant_id = bikes.tenant_id
        AND atl.agency_id = ANY(get_user_agency_ids())
        AND atl.status = 'active'
    )
  );

CREATE POLICY "bikes_insert" ON public.bikes
  FOR INSERT WITH CHECK (
    tenant_id = ANY(get_user_tenant_ids())
    OR is_platform_admin()
  );

CREATE POLICY "bikes_update" ON public.bikes
  FOR UPDATE USING (
    tenant_id = ANY(get_user_tenant_ids())
    OR is_platform_admin()
  );

CREATE POLICY "bikes_delete" ON public.bikes
  FOR DELETE USING (
    tenant_id = ANY(get_user_tenant_ids())
    OR is_platform_admin()
  );

CREATE TRIGGER set_bikes_updated_at
  BEFORE UPDATE ON public.bikes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-generate QR code on insert if not provided
CREATE OR REPLACE FUNCTION generate_bike_qr_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.qr_code IS NULL THEN
    NEW.qr_code := 'BIKE-' || REPLACE(NEW.id::TEXT, '-', '');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER bikes_auto_qr
  BEFORE INSERT ON public.bikes
  FOR EACH ROW EXECUTE FUNCTION generate_bike_qr_code();

COMMENT ON TABLE public.bikes IS 'Per-serial fleet inventory for bike rentals (hospitality/restaurant style pattern)';
COMMENT ON COLUMN public.bikes.qr_code IS 'Auto-generated BIKE-<uuid> for fast scan check-in/out operations';
COMMENT ON COLUMN public.bikes.battery_health_pct IS 'E-bike battery health % (100=new, degrades with cycles)';
