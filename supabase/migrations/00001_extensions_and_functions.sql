-- 00001: Estensioni, enum condivisi e funzioni helper
-- Fondamenta per tutto lo schema TouraCore

-- Estensioni
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Enum condivisi
CREATE TYPE tenant_role AS ENUM ('owner', 'admin', 'member');
CREATE TYPE staff_role AS ENUM (
  'owner',
  'manager',
  'receptionist',
  'housekeeper',
  'restaurant_staff',
  'accountant',
  'maintenance'
);

-- Funzione trigger per aggiornamento automatico di updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Funzioni RLS helper: usano plpgsql per deferire la validazione
-- (memberships non esiste ancora in questo migration)
CREATE OR REPLACE FUNCTION get_user_tenant_ids()
RETURNS UUID[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN COALESCE(
    (SELECT array_agg(tenant_id)
     FROM memberships
     WHERE user_id = auth.uid()
       AND is_active = true),
    ARRAY[]::UUID[]
  );
END;
$$;

CREATE OR REPLACE FUNCTION get_user_organization_ids()
RETURNS SETOF UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
    SELECT tenant_id FROM memberships WHERE user_id = auth.uid() AND is_active = true;
END;
$$;
