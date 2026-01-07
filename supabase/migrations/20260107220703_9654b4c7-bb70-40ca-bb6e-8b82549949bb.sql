-- Add CTA button text columns to site_settings
ALTER TABLE public.site_settings
ADD COLUMN IF NOT EXISTS hero_cta_primary_ro TEXT,
ADD COLUMN IF NOT EXISTS hero_cta_primary_en TEXT,
ADD COLUMN IF NOT EXISTS hero_cta_secondary_ro TEXT,
ADD COLUMN IF NOT EXISTS hero_cta_secondary_en TEXT;