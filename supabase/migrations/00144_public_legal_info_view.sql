-- 00144: Public legal info view for footer compliance display.
--
-- Italy obligations: D.Lgs. 70/2003 art. 7 requires display of company name,
-- VAT, REA, and legal address on commercial websites. Locazione turistica
-- (CIN under D.L. 145/2023) requires CIN display on booking pages too.
--
-- Exposes ONLY columns already public-by-law. NO IBAN, NO Stripe IDs,
-- NO PEC, NO SDI, NO bank/financial fields.
--
-- Joined to entities so a single entity can resolve its operating legal_entity.

CREATE OR REPLACE VIEW public.public_entity_legal_view
WITH (security_invoker = false) AS
SELECT
  e.id AS entity_id,
  le.company_name,
  le.display_name,
  le.vat_number,
  le.rea_number,
  le.address_street,
  le.address_city,
  le.address_zip,
  le.address_province,
  le.address_country,
  le.cin_code AS legal_cin_code
FROM public.entities e
JOIN public.legal_entities le ON le.id = e.legal_entity_id AND le.is_active = true
JOIN public.public_listings pl ON pl.entity_id = e.id AND pl.is_public = true;

GRANT SELECT ON public.public_entity_legal_view TO anon, authenticated;

COMMENT ON VIEW public.public_entity_legal_view IS
  'Anon-safe legal info per public entity (company name, VAT, REA, legal address, CIN). Required by D.Lgs.70/2003 + D.L.145/2023. Excludes financial/PEC/SDI data.';
