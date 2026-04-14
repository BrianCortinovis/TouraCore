-- 00038: Vista finanziaria prenotazioni
-- Dipende da: 00034 (bookings con check-in/out), 00037 (payments)

CREATE OR REPLACE VIEW v_reservation_financials AS
SELECT
  b.id,
  b.entity_id,
  b.tenant_id,
  b.guest_name,
  b.guest_email,
  b.check_in,
  b.check_out,
  b.status,
  b.source,
  CASE WHEN b.source = 'direct' THEN true ELSE false END AS is_direct,
  b.total_amount AS gross_amount,
  b.commission_amount,
  b.commission_rate,
  COALESCE((b.vertical_data->>'tourist_tax_amount')::DECIMAL, 0) AS tourist_tax_amount,
  COALESCE((b.vertical_data->>'cedolare_secca_amount')::DECIMAL, 0) AS cedolare_secca_amount,
  COALESCE((b.vertical_data->>'iva_amount')::DECIMAL, 0) AS iva_amount,
  COALESCE((b.vertical_data->>'ritenuta_ota_amount')::DECIMAL, 0) AS ritenuta_ota_amount,
  b.total_amount
    - b.commission_amount
    - COALESCE((b.vertical_data->>'tourist_tax_amount')::DECIMAL, 0)
    - COALESCE((b.vertical_data->>'cedolare_secca_amount')::DECIMAL, 0)
    - COALESCE((b.vertical_data->>'iva_amount')::DECIMAL, 0)
    - COALESCE((b.vertical_data->>'ritenuta_ota_amount')::DECIMAL, 0)
  AS net_income,
  COALESCE(paid.total_paid, 0) AS paid_amount,
  b.total_amount - COALESCE(paid.total_paid, 0) AS balance,
  b.total_amount
    - b.commission_amount
    - COALESCE((b.vertical_data->>'ritenuta_ota_amount')::DECIMAL, 0)
  AS effective_receivable,
  COALESCE(b.vertical_data->>'ota_payment_type', '') AS ota_payment_type,
  COALESCE(b.vertical_data->>'channel_name', b.source) AS channel_name,
  b.created_at,
  b.updated_at
FROM bookings b
LEFT JOIN LATERAL (
  SELECT COALESCE(SUM(p.amount), 0) AS total_paid
  FROM payments p
  WHERE p.reservation_id = b.id AND p.is_refund = false
) paid ON true
WHERE b.status NOT IN ('canceled');
