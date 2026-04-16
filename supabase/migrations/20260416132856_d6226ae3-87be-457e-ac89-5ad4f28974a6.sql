ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS rooms integer,
  ADD COLUMN IF NOT EXISTS kitchens integer,
  ADD COLUMN IF NOT EXISTS comfort_level text,
  ADD COLUMN IF NOT EXISTS property_subtype text,
  ADD COLUMN IF NOT EXISTS height_regime text,
  ADD COLUMN IF NOT EXISTS destination text;