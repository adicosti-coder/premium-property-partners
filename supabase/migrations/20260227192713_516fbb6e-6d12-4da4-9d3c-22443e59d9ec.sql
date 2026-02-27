
-- Add missing columns for cazare (short-term rental) properties
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS capacity integer DEFAULT 2,
  ADD COLUMN IF NOT EXISTS bedrooms integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS bathrooms integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS size integer DEFAULT 40,
  ADD COLUMN IF NOT EXISTS amenities text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS amenities_en text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS house_rules text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS house_rules_en text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS check_in_time text DEFAULT '15:00',
  ADD COLUMN IF NOT EXISTS check_out_time text DEFAULT '11:00',
  ADD COLUMN IF NOT EXISTS long_description_ro text,
  ADD COLUMN IF NOT EXISTS long_description_en text,
  ADD COLUMN IF NOT EXISTS images text[] DEFAULT '{}'::text[];

-- Create unique index on slug for cazare properties
CREATE UNIQUE INDEX IF NOT EXISTS idx_properties_slug ON public.properties (slug) WHERE slug IS NOT NULL;
