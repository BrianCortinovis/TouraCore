-- 00071: folio_charges — bridge charge-to-room hospitality + meal plan credits
-- Modulo: Restaurant M025

CREATE TABLE public.folio_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN (
    'restaurant_order','minibar','spa','laundry','phone','adjustment','reversal'
  )),
  source_id UUID,
  description TEXT,
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  vat_pct NUMERIC(4,2) NOT NULL DEFAULT 10,
  vat_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  meal_plan_credit_used NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_folio_charges_reservation ON public.folio_charges(reservation_id);
CREATE INDEX idx_folio_charges_source ON public.folio_charges(source, source_id);

ALTER TABLE public.folio_charges ENABLE ROW LEVEL SECURITY;

-- RLS via reservation tenant chain
CREATE POLICY "folio_charges_all" ON public.folio_charges
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.reservations r
            JOIN public.entities e ON e.id = r.entity_id
            WHERE r.id = folio_charges.reservation_id
              AND (e.tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.reservations r
            JOIN public.entities e ON e.id = r.entity_id
            WHERE r.id = folio_charges.reservation_id
              AND (e.tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin()))
  );

-- ============================================================================
-- Meal plan credits ledger
-- ============================================================================

CREATE TABLE public.meal_plan_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast','lunch','dinner')),
  service_date DATE NOT NULL,
  covers_allotted SMALLINT NOT NULL DEFAULT 1,
  covers_used SMALLINT NOT NULL DEFAULT 0,
  amount_per_cover NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (reservation_id, meal_type, service_date)
);

CREATE INDEX idx_meal_plan_credits_reservation ON public.meal_plan_credits(reservation_id);
CREATE INDEX idx_meal_plan_credits_date ON public.meal_plan_credits(service_date);

ALTER TABLE public.meal_plan_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "meal_plan_credits_all" ON public.meal_plan_credits
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.reservations r
            JOIN public.entities e ON e.id = r.entity_id
            WHERE r.id = meal_plan_credits.reservation_id
              AND (e.tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.reservations r
            JOIN public.entities e ON e.id = r.entity_id
            WHERE r.id = meal_plan_credits.reservation_id
              AND (e.tenant_id = ANY(get_user_tenant_ids()) OR is_platform_admin()))
  );

CREATE TRIGGER set_meal_plan_credits_updated_at
  BEFORE UPDATE ON public.meal_plan_credits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- Aggiungi charge_to_room a restaurant_orders se non già presente
-- ============================================================================

ALTER TABLE public.restaurant_orders
  DROP CONSTRAINT IF EXISTS restaurant_orders_payment_method_check;

-- charge_to_room_reservation_id già presente in 00069
