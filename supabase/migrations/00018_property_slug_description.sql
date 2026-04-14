-- 00018: Aggiunge slug e descrizione alle proprietà per pagine pubbliche
-- Dipende da: properties (00007)

ALTER TABLE properties ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS description TEXT;

CREATE INDEX IF NOT EXISTS idx_properties_slug ON properties(slug);

-- Policy pubblica per lettura proprietà via slug (pagine pubbliche)
CREATE POLICY "properties_public_read_by_slug" ON properties
  FOR SELECT USING (slug IS NOT NULL AND is_active = true);
