-- Add hero text columns to site_settings
ALTER TABLE public.site_settings
ADD COLUMN IF NOT EXISTS hero_title_ro TEXT,
ADD COLUMN IF NOT EXISTS hero_title_en TEXT,
ADD COLUMN IF NOT EXISTS hero_highlight_ro TEXT,
ADD COLUMN IF NOT EXISTS hero_highlight_en TEXT,
ADD COLUMN IF NOT EXISTS hero_subtitle_ro TEXT,
ADD COLUMN IF NOT EXISTS hero_subtitle_en TEXT,
ADD COLUMN IF NOT EXISTS hero_badge_ro TEXT,
ADD COLUMN IF NOT EXISTS hero_badge_en TEXT;