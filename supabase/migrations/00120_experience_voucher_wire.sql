-- 00120: Extend credit_transactions + voucher redeem PG function per experience_reservations
-- Modulo: Experience M062

ALTER TABLE public.credit_transactions DROP CONSTRAINT IF EXISTS credit_transactions_reservation_table_check;
ALTER TABLE public.credit_transactions ADD CONSTRAINT credit_transactions_reservation_table_check
  CHECK (reservation_table IS NULL OR reservation_table IN (
    'reservations','restaurant_reservations','bike_rental_reservations','reservation_bundles','experience_reservations'
  ));

COMMENT ON COLUMN public.credit_transactions.reservation_table IS 'Polymorphic reservation table — extended in 00120 per experience_reservations';
