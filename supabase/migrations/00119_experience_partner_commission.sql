-- 00119: Extend partner_commissions reservation_table allowlist + add trigger auto-create commission
-- Modulo: Experience M062

-- Drop old check, add new con experience_reservations
ALTER TABLE public.partner_commissions DROP CONSTRAINT IF EXISTS partner_commissions_reservation_table_check;
ALTER TABLE public.partner_commissions ADD CONSTRAINT partner_commissions_reservation_table_check
  CHECK (reservation_table IN ('reservations','restaurant_reservations','bike_rental_reservations','reservation_bundles','experience_reservations'));

-- Trigger: auto-create commission su experience_reservations confirm con partner_id
CREATE OR REPLACE FUNCTION create_experience_partner_commission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_commission_pct NUMERIC(5,2);
  v_commission_amount NUMERIC(12,2);
BEGIN
  IF NEW.partner_id IS NULL THEN RETURN NEW; END IF;
  IF NEW.status != 'confirmed' AND NEW.status != 'completed' THEN RETURN NEW; END IF;
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;

  SELECT commission_pct_default INTO v_commission_pct
    FROM public.partners WHERE id = NEW.partner_id;
  IF v_commission_pct IS NULL THEN v_commission_pct := 15; END IF;

  v_commission_amount := (NEW.total_cents::NUMERIC / 100) * v_commission_pct / 100;

  INSERT INTO public.partner_commissions (
    partner_id, tenant_id, reservation_id, reservation_table, vertical,
    booking_amount, commission_pct, commission_amount, currency, status,
    earned_at, idempotency_key
  ) VALUES (
    NEW.partner_id, NEW.tenant_id, NEW.id, 'experience_reservations', 'experiences',
    NEW.total_cents::NUMERIC / 100, v_commission_pct, v_commission_amount, NEW.currency, 'earned',
    NOW(), 'exp:' || NEW.id::TEXT
  )
  ON CONFLICT (reservation_id, reservation_table, partner_id) DO NOTHING;

  RETURN NEW;
END $$;

CREATE TRIGGER trg_experience_partner_commission
  AFTER UPDATE OF status ON public.experience_reservations
  FOR EACH ROW EXECUTE FUNCTION create_experience_partner_commission();
