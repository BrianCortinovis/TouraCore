-- 00023: Aggiunge slug a tenants per onboarding e URL
-- Lo slug è unico e obbligatorio, usato per identificare il tenant in URL pubblici

ALTER TABLE tenants ADD COLUMN slug TEXT;

-- Genera slug per eventuali tenant esistenti
UPDATE tenants SET slug = LOWER(REPLACE(name, ' ', '-')) || '-' || SUBSTR(gen_random_uuid()::TEXT, 1, 6)
WHERE slug IS NULL;

ALTER TABLE tenants ALTER COLUMN slug SET NOT NULL;

CREATE UNIQUE INDEX idx_tenants_slug ON tenants(slug);

-- Colonna is_active per poter disabilitare tenant
ALTER TABLE tenants ADD COLUMN is_active BOOLEAN DEFAULT true;
