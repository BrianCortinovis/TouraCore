-- 00095: Bike rental reservations + items + addons
-- Dipende da: 00093 (bike_rentals+bike_locations), 00094 (bikes), 00033 (guests)
-- Modulo: Bike Rental M038/S03

-- =============================================================================
-- 1. bike_rental_reservations — hourly-slot booking (timestamptz, NOT dates)
-- =============================================================================
CREATE TABLE public.bike_rental_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bike_rental_id UUID NOT NULL REFERENCES public.bike_rentals(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  reference_code TEXT NOT NULL,
  -- Guest
  guest_id UUID REFERENCES public.guests(id) ON DELETE SET NULL,
  guest_name TEXT,
  guest_email TEXT,
  guest_phone TEXT,
  guest_document_type TEXT CHECK (guest_document_type IS NULL OR guest_document_type IN ('passport','id_card','driver_license','other')),
  guest_document_number TEXT,
  guest_height_cm INT CHECK (guest_height_cm IS NULL OR guest_height_cm BETWEEN 80 AND 250),
  guest_weight_kg INT CHECK (guest_weight_kg IS NULL OR guest_weight_kg BETWEEN 15 AND 300),
  guest_experience TEXT CHECK (guest_experience IS NULL OR guest_experience IN ('beginner','intermediate','expert','pro')),
  -- Time window
  rental_start TIMESTAMPTZ NOT NULL,
  rental_end TIMESTAMPTZ NOT NULL,
  actual_pickup_at TIMESTAMPTZ,
  actual_return_at TIMESTAMPTZ,
  duration_hours NUMERIC(6,2) GENERATED ALWAYS AS (
    ROUND((EXTRACT(EPOCH FROM (rental_end - rental_start)) / 3600)::NUMERIC, 2)
  ) STORED,
  -- Location
  pickup_location_id UUID REFERENCES public.bike_locations(id) ON DELETE SET NULL,
  return_location_id UUID REFERENCES public.bike_locations(id) ON DELETE SET NULL,
  is_one_way BOOLEAN GENERATED ALWAYS AS (
    pickup_location_id IS DISTINCT FROM return_location_id
    AND pickup_location_id IS NOT NULL
    AND return_location_id IS NOT NULL
  ) STORED,
  delivery_address TEXT,
  delivery_km NUMERIC(6,2) CHECK (delivery_km IS NULL OR delivery_km >= 0),
  -- Pricing breakdown
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  addons_total NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (addons_total >= 0),
  delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (delivery_fee >= 0),
  one_way_fee NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (one_way_fee >= 0),
  discount NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
  tax_amount NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  currency TEXT NOT NULL DEFAULT 'EUR',
  -- Deposit
  deposit_amount NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (deposit_amount >= 0),
  deposit_payment_intent TEXT,
  deposit_released_at TIMESTAMPTZ,
  deposit_captured_amount NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (deposit_captured_amount >= 0),
  -- Insurance
  insurance_tier TEXT CHECK (insurance_tier IS NULL OR insurance_tier IN ('none','basic','standard','premium')),
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending','confirmed','checked_in','active','returned','cancelled','no_show','late','completed'
  )),
  agreement_signed_at TIMESTAMPTZ,
  agreement_signature_data JSONB,
  -- Return / damage
  damage_report JSONB,
  damage_cost_total NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (damage_cost_total >= 0),
  late_fee NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (late_fee >= 0),
  insurance_claim_id TEXT,
  -- Source / channel (preparatorio M046 channel manager)
  source TEXT NOT NULL DEFAULT 'direct',
  channel_booking_ref TEXT,
  notes_internal TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Constraints
  CONSTRAINT bike_res_time_order CHECK (rental_end > rental_start),
  CONSTRAINT bike_res_reference_unique UNIQUE (tenant_id, reference_code)
);

CREATE INDEX idx_bike_res_rental ON public.bike_rental_reservations(bike_rental_id);
CREATE INDEX idx_bike_res_tenant ON public.bike_rental_reservations(tenant_id);
CREATE INDEX idx_bike_res_guest ON public.bike_rental_reservations(guest_id) WHERE guest_id IS NOT NULL;
CREATE INDEX idx_bike_res_status ON public.bike_rental_reservations(bike_rental_id, status);
CREATE INDEX idx_bike_res_time_range ON public.bike_rental_reservations(bike_rental_id, rental_start, rental_end);
CREATE INDEX idx_bike_res_pickup_loc ON public.bike_rental_reservations(pickup_location_id) WHERE pickup_location_id IS NOT NULL;
CREATE INDEX idx_bike_res_source ON public.bike_rental_reservations(source) WHERE source <> 'direct';

ALTER TABLE public.bike_rental_reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bike_res_select" ON public.bike_rental_reservations
  FOR SELECT USING (
    tenant_id = ANY(get_user_tenant_ids())
    OR is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM public.agency_tenant_links atl
      WHERE atl.tenant_id = bike_rental_reservations.tenant_id
        AND atl.agency_id = ANY(get_user_agency_ids())
        AND atl.status = 'active'
    )
  );

CREATE POLICY "bike_res_insert" ON public.bike_rental_reservations
  FOR INSERT WITH CHECK (
    tenant_id = ANY(get_user_tenant_ids())
    OR is_platform_admin()
  );

CREATE POLICY "bike_res_update" ON public.bike_rental_reservations
  FOR UPDATE USING (
    tenant_id = ANY(get_user_tenant_ids())
    OR is_platform_admin()
  );

CREATE POLICY "bike_res_delete" ON public.bike_rental_reservations
  FOR DELETE USING (
    tenant_id = ANY(get_user_tenant_ids())
    OR is_platform_admin()
  );

CREATE TRIGGER set_bike_res_updated_at
  BEFORE UPDATE ON public.bike_rental_reservations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- 2. bike_rental_reservation_items — line items (group booking multi-bike)
-- =============================================================================
CREATE TABLE public.bike_rental_reservation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES public.bike_rental_reservations(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  bike_id UUID REFERENCES public.bikes(id) ON DELETE SET NULL,
  bike_type TEXT NOT NULL,
  frame_size TEXT,
  rider_name TEXT,
  rider_height_cm INT CHECK (rider_height_cm IS NULL OR rider_height_cm BETWEEN 80 AND 250),
  rider_age INT CHECK (rider_age IS NULL OR rider_age BETWEEN 2 AND 120),
  rider_experience TEXT CHECK (rider_experience IS NULL OR rider_experience IN ('beginner','intermediate','expert','pro')),
  base_price NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (base_price >= 0),
  discount NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
  line_total NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (line_total >= 0),
  pickup_photos TEXT[] NOT NULL DEFAULT '{}',
  return_photos TEXT[] NOT NULL DEFAULT '{}',
  pickup_battery_pct INT CHECK (pickup_battery_pct IS NULL OR pickup_battery_pct BETWEEN 0 AND 100),
  return_battery_pct INT CHECK (return_battery_pct IS NULL OR return_battery_pct BETWEEN 0 AND 100),
  pickup_km NUMERIC(8,2) CHECK (pickup_km IS NULL OR pickup_km >= 0),
  return_km NUMERIC(8,2) CHECK (return_km IS NULL OR return_km >= 0),
  condition_at_pickup TEXT CHECK (condition_at_pickup IS NULL OR condition_at_pickup IN ('A','B','C','D')),
  condition_at_return TEXT CHECK (condition_at_return IS NULL OR condition_at_return IN ('A','B','C','D')),
  damage_noted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bike_res_items_res ON public.bike_rental_reservation_items(reservation_id);
CREATE INDEX idx_bike_res_items_bike ON public.bike_rental_reservation_items(bike_id) WHERE bike_id IS NOT NULL;
CREATE INDEX idx_bike_res_items_tenant ON public.bike_rental_reservation_items(tenant_id);

ALTER TABLE public.bike_rental_reservation_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bike_res_items_select" ON public.bike_rental_reservation_items
  FOR SELECT USING (
    tenant_id = ANY(get_user_tenant_ids())
    OR is_platform_admin()
  );

CREATE POLICY "bike_res_items_insert" ON public.bike_rental_reservation_items
  FOR INSERT WITH CHECK (
    tenant_id = ANY(get_user_tenant_ids())
    OR is_platform_admin()
  );

CREATE POLICY "bike_res_items_update" ON public.bike_rental_reservation_items
  FOR UPDATE USING (
    tenant_id = ANY(get_user_tenant_ids())
    OR is_platform_admin()
  );

CREATE POLICY "bike_res_items_delete" ON public.bike_rental_reservation_items
  FOR DELETE USING (
    tenant_id = ANY(get_user_tenant_ids())
    OR is_platform_admin()
  );

-- =============================================================================
-- 3. bike_rental_reservation_addons — helmet/lock/insurance/etc per reservation
-- =============================================================================
CREATE TABLE public.bike_rental_reservation_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES public.bike_rental_reservations(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  addon_key TEXT NOT NULL,
  addon_label TEXT,
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  line_total NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (line_total >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bike_res_addons_res ON public.bike_rental_reservation_addons(reservation_id);
CREATE INDEX idx_bike_res_addons_tenant ON public.bike_rental_reservation_addons(tenant_id);

ALTER TABLE public.bike_rental_reservation_addons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bike_res_addons_select" ON public.bike_rental_reservation_addons
  FOR SELECT USING (
    tenant_id = ANY(get_user_tenant_ids())
    OR is_platform_admin()
  );

CREATE POLICY "bike_res_addons_insert" ON public.bike_rental_reservation_addons
  FOR INSERT WITH CHECK (
    tenant_id = ANY(get_user_tenant_ids())
    OR is_platform_admin()
  );

CREATE POLICY "bike_res_addons_update" ON public.bike_rental_reservation_addons
  FOR UPDATE USING (
    tenant_id = ANY(get_user_tenant_ids())
    OR is_platform_admin()
  );

CREATE POLICY "bike_res_addons_delete" ON public.bike_rental_reservation_addons
  FOR DELETE USING (
    tenant_id = ANY(get_user_tenant_ids())
    OR is_platform_admin()
  );

COMMENT ON TABLE public.bike_rental_reservations IS 'Hourly-slot bike rental bookings (TIMESTAMPTZ precise, not daily)';
COMMENT ON COLUMN public.bike_rental_reservations.duration_hours IS 'Auto-computed from rental_start/rental_end';
COMMENT ON COLUMN public.bike_rental_reservations.is_one_way IS 'TRUE if pickup_location_id != return_location_id';
COMMENT ON TABLE public.bike_rental_reservation_items IS 'Line items per reservation (group booking multi-bike with per-rider details)';
COMMENT ON TABLE public.bike_rental_reservation_addons IS 'Per-reservation add-ons (helmet, lock, insurance, delivery, gps)';
