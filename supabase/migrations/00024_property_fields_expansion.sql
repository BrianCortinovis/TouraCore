-- Espansione campi properties: descrizione breve, coordinate GPS, regione, amenities
-- Dipende da: 00007_hospitality_properties.sql

ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS short_description TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS latitude NUMERIC;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS longitude NUMERIC;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS region TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS amenities JSONB DEFAULT '[]'::jsonb;
