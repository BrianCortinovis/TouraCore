-- 00113: Experience reservations + guests + waiver signatures
-- Modulo: Experience M055

CREATE TABLE public.experience_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL REFERENCES public.experience_entities(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.experience_products(id) ON DELETE RESTRICT,
  timeslot_id UUID REFERENCES public.experience_timeslots(id) ON DELETE SET NULL,
  reference_code TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  customer_language TEXT DEFAULT 'it',
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  guests_count INT NOT NULL CHECK (guests_count > 0),
  subtotal_cents INT NOT NULL DEFAULT 0 CHECK (subtotal_cents >= 0),
  addons_cents INT NOT NULL DEFAULT 0 CHECK (addons_cents >= 0),
  pickup_cents INT NOT NULL DEFAULT 0 CHECK (pickup_cents >= 0),
  discount_cents INT NOT NULL DEFAULT 0 CHECK (discount_cents >= 0),
  tax_cents INT NOT NULL DEFAULT 0 CHECK (tax_cents >= 0),
  total_cents INT NOT NULL DEFAULT 0 CHECK (total_cents >= 0),
  deposit_cents INT NOT NULL DEFAULT 0 CHECK (deposit_cents >= 0),
  balance_due_cents INT NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','checked_in','completed','cancelled','no_show')),
  payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid','deposit_paid','paid','refunded','partial_refund')),
  source TEXT NOT NULL DEFAULT 'direct' CHECK (source IN ('direct','viator','getyourguide','expedia_local','musement','tiqets','klook','civitatis','headout','regiondo_marketplace','bokun_b2b','manual','zapier','partner')),
  partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
  voucher_code TEXT,
  gift_card_id UUID,
  pickup_zone_id UUID REFERENCES public.experience_pickup_zones(id) ON DELETE SET NULL,
  pickup_address TEXT,
  notes TEXT,
  cancellation_reason TEXT,
  cancelled_at TIMESTAMPTZ,
  checked_in_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, reference_code),
  CHECK (end_at > start_at)
);
CREATE INDEX idx_er_tenant_status ON public.experience_reservations(tenant_id, status);
CREATE INDEX idx_er_timeslot ON public.experience_reservations(timeslot_id) WHERE timeslot_id IS NOT NULL;
CREATE INDEX idx_er_product ON public.experience_reservations(product_id, start_at);
CREATE INDEX idx_er_start ON public.experience_reservations(start_at);
CREATE INDEX idx_er_partner ON public.experience_reservations(partner_id) WHERE partner_id IS NOT NULL;

ALTER TABLE public.experience_reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "er_all" ON public.experience_reservations FOR ALL USING (
  tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin() OR EXISTS (
    SELECT 1 FROM public.agency_tenant_links atl WHERE atl.tenant_id = experience_reservations.tenant_id AND atl.agency_id = ANY(get_user_agency_ids()) AND atl.status = 'active'
  )
) WITH CHECK (tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin());
CREATE TRIGGER set_er_updated_at BEFORE UPDATE ON public.experience_reservations FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE public.experience_reservation_guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES public.experience_reservations(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES public.experience_variants(id) ON DELETE SET NULL,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  date_of_birth DATE,
  custom_fields_values JSONB NOT NULL DEFAULT '{}'::jsonb,
  waiver_id UUID REFERENCES public.experience_waivers(id) ON DELETE SET NULL,
  waiver_signed_at TIMESTAMPTZ,
  waiver_signature_hash TEXT,
  waiver_ip TEXT,
  check_in_qr TEXT,
  checked_in_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_erg_reservation ON public.experience_reservation_guests(reservation_id);
CREATE INDEX idx_erg_tenant ON public.experience_reservation_guests(tenant_id);
CREATE INDEX idx_erg_qr ON public.experience_reservation_guests(check_in_qr) WHERE check_in_qr IS NOT NULL;

ALTER TABLE public.experience_reservation_guests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "erg_all" ON public.experience_reservation_guests FOR ALL USING (
  tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin()
) WITH CHECK (tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin());

CREATE TABLE public.experience_reservation_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES public.experience_reservations(id) ON DELETE CASCADE,
  addon_id UUID NOT NULL REFERENCES public.experience_addons(id) ON DELETE RESTRICT,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price_cents INT NOT NULL CHECK (unit_price_cents >= 0),
  line_total_cents INT NOT NULL CHECK (line_total_cents >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_era_res ON public.experience_reservation_addons(reservation_id);
CREATE INDEX idx_era_addon ON public.experience_reservation_addons(addon_id);

ALTER TABLE public.experience_reservation_addons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "era_addon_all" ON public.experience_reservation_addons FOR ALL USING (
  tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin()
) WITH CHECK (tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin());
