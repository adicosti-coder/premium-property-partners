-- Add hero tags columns to site_settings (stored as JSON array)
ALTER TABLE public.site_settings
ADD COLUMN IF NOT EXISTS hero_tags_ro TEXT[] DEFAULT NULL,
ADD COLUMN IF NOT EXISTS hero_tags_en TEXT[] DEFAULT NULL;