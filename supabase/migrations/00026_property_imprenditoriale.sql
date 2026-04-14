-- 00026: Aggiunge is_imprenditoriale a properties (non presente in 00025 originale)
ALTER TABLE properties ADD COLUMN IF NOT EXISTS is_imprenditoriale BOOLEAN DEFAULT true;
