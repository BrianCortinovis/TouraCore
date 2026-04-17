-- 00058: Module catalog + entity kind extension + bundle discounts
-- Dipende da: entities (00028), tenants (00002)
-- Fase F1 — foundation multi-module

-- ============================================================================
-- 1. ESTENDERE entities.kind per 7 moduli (hospitality + restaurant + 5 altri)
-- ============================================================================

ALTER TABLE public.entities DROP CONSTRAINT IF EXISTS entities_kind_check;
ALTER TABLE public.entities ADD CONSTRAINT entities_kind_check
  CHECK (kind IN ('accommodation','activity','restaurant','wellness','bike_rental','moto_rental','ski_school'));

-- ============================================================================
-- 2. MODULE CATALOG — source di verità per i moduli e prezzi base
-- ============================================================================

CREATE TABLE public.module_catalog (
  code TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  base_price_eur NUMERIC(10,2) NOT NULL DEFAULT 0,
  stripe_price_id_monthly TEXT,
  stripe_price_id_yearly TEXT,
  entity_kind TEXT,
  dependencies TEXT[] NOT NULL DEFAULT '{}',
  trial_days INT NOT NULL DEFAULT 14,
  pausable BOOLEAN NOT NULL DEFAULT FALSE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  order_idx INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.module_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "module_catalog_read_all" ON public.module_catalog
  FOR SELECT USING (TRUE);

CREATE POLICY "module_catalog_admin_write" ON public.module_catalog
  FOR ALL USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

INSERT INTO public.module_catalog (code, label, description, icon, base_price_eur, entity_kind, order_idx, pausable) VALUES
 ('hospitality', 'Struttura ricettiva', 'Hotel, B&B, agriturismo, residence, casa vacanze, affittacamere', 'Hotel', 29, 'accommodation', 1, FALSE),
 ('restaurant', 'Ristorazione', 'Prenotazioni tavoli, POS, KDS, menu, inventory', 'UtensilsCrossed', 29, 'restaurant', 2, FALSE),
 ('wellness', 'Wellness/SPA', 'Prenotazioni trattamenti, operatori, cabine', 'Sparkles', 19, 'wellness', 3, FALSE),
 ('experiences', 'Esperienze/Tour', 'Tour, corsi, esperienze con slot e guide', 'MapPin', 19, 'activity', 4, FALSE),
 ('bike_rental', 'Bike/E-bike', 'Noleggio bici e e-bike, inventario mezzi, percorsi', 'Bike', 15, 'bike_rental', 5, TRUE),
 ('moto_rental', 'Moto', 'Noleggio moto, patente, cauzione, inventario', 'Bike', 19, 'moto_rental', 6, TRUE),
 ('ski_school', 'Scuola sci', 'Lezioni sci/snowboard, maestri, livelli, gruppi', 'Snowflake', 15, 'ski_school', 7, TRUE);

-- ============================================================================
-- 3. BUNDLE DISCOUNTS — sconto progressivo multi-modulo
-- ============================================================================

CREATE TABLE public.bundle_discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  min_modules INT NOT NULL,
  discount_percent NUMERIC(5,2) NOT NULL CHECK (discount_percent >= 0 AND discount_percent <= 100),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.bundle_discounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bundle_discounts_read_all" ON public.bundle_discounts
  FOR SELECT USING (TRUE);

CREATE POLICY "bundle_discounts_admin_write" ON public.bundle_discounts
  FOR ALL USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

INSERT INTO public.bundle_discounts (min_modules, discount_percent) VALUES
 (2, 10),
 (3, 15),
 (4, 20);

-- ============================================================================
-- 4. Trigger updated_at
-- ============================================================================

CREATE TRIGGER set_module_catalog_updated_at
  BEFORE UPDATE ON public.module_catalog
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
