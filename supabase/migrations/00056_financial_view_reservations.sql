-- 00056: rifa v_reservation_financials su tabella reservations (post 00046 migration)
-- Prima puntava a bookings (legacy). Fix scoperto durante demo seed Q2 2026.

DROP VIEW IF EXISTS v_reservation_financials;

CREATE VIEW v_reservation_financials AS
SELECT
  r.id,
  r.entity_id,
  e.tenant_id,
  COALESCE(g.first_name || ' ' || g.last_name, '') AS guest_name,
  g.email AS guest_email,
  r.check_in,
  r.check_out,
  r.status::text AS status,
  r.source::text AS source,
  CASE WHEN r.source = 'direct' THEN true ELSE false END AS is_direct,
  r.total_amount AS gross_amount,
  r.commission_amount,
  r.commission_rate,
  -- Tourist tax reale dal record collegato
  COALESCE((SELECT total_amount FROM tourist_tax_records t WHERE t.reservation_id = r.id LIMIT 1), 0) AS tourist_tax_amount,
  -- Cedolare secca calcolata sul regime fiscale accommodation
  CASE
    WHEN a.cedolare_secca_enabled THEN ROUND((r.total_amount * a.cedolare_secca_rate / 100)::numeric, 2)
    ELSE 0
  END AS cedolare_secca_amount,
  -- IVA calcolata se has_vat
  CASE
    WHEN a.has_vat THEN ROUND((r.total_amount - r.total_amount/(1+a.default_vat_rate/100))::numeric, 2)
    ELSE 0
  END AS iva_amount,
  -- Ritenuta OTA
  CASE
    WHEN a.ritenuta_ota_enabled AND r.source IN ('booking_com','expedia','airbnb') THEN
      ROUND((r.commission_amount * a.ritenuta_ota_rate / 100)::numeric, 2)
    ELSE 0
  END AS ritenuta_ota_amount,
  -- Net income = gross - commission - tax - cedolare - iva - ritenuta
  r.total_amount
    - r.commission_amount
    - COALESCE((SELECT total_amount FROM tourist_tax_records t WHERE t.reservation_id = r.id LIMIT 1), 0)
    - CASE WHEN a.cedolare_secca_enabled THEN ROUND((r.total_amount * a.cedolare_secca_rate / 100)::numeric, 2) ELSE 0 END
    - CASE WHEN a.has_vat THEN ROUND((r.total_amount - r.total_amount/(1+a.default_vat_rate/100))::numeric, 2) ELSE 0 END
    - CASE WHEN a.ritenuta_ota_enabled AND r.source IN ('booking_com','expedia','airbnb')
           THEN ROUND((r.commission_amount * a.ritenuta_ota_rate / 100)::numeric, 2) ELSE 0 END
  AS net_income,
  r.paid_amount,
  r.total_amount - r.paid_amount AS balance,
  r.total_amount
    - r.commission_amount
    - CASE WHEN a.ritenuta_ota_enabled AND r.source IN ('booking_com','expedia','airbnb')
           THEN ROUND((r.commission_amount * a.ritenuta_ota_rate / 100)::numeric, 2) ELSE 0 END
  AS effective_receivable,
  COALESCE(r.ota_payment_type::text, '') AS ota_payment_type,
  COALESCE(r.channel_name, r.source::text) AS channel_name,
  r.created_at,
  r.updated_at
FROM reservations r
JOIN entities e ON e.id = r.entity_id
JOIN accommodations a ON a.entity_id = r.entity_id
LEFT JOIN guests g ON g.id = r.guest_id
WHERE r.status::text NOT IN ('cancelled');

COMMENT ON VIEW v_reservation_financials IS 'Dati finanziari per reservation — post migration 00046 bookings→reservations';
