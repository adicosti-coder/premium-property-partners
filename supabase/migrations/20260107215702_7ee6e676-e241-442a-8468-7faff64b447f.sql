-- Add hero image columns to site_settings
ALTER TABLE public.site_settings
ADD COLUMN IF NOT EXISTS hero_image_url TEXT,
ADD COLUMN IF NOT EXISTS hero_image_filename TEXT;

-- Update default row with initial values
UPDATE public.site_settings
SET hero_image_url = NULL, hero_image_filename = NULL
WHERE id = 'default' AND hero_image_url IS NULL;