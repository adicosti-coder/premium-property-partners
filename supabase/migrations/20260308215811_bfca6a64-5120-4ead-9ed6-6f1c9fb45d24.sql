-- Fix: view needs SECURITY DEFINER to bypass RLS on site_settings for public hero data
DROP VIEW IF EXISTS public.public_site_settings;

CREATE OR REPLACE VIEW public.public_site_settings
WITH (security_barrier = true) AS
SELECT 
  id, hero_video_url, hero_video_filename, hero_image_url, hero_image_filename,
  hero_title_ro, hero_title_en, hero_highlight_ro, hero_highlight_en,
  hero_subtitle_ro, hero_subtitle_en, hero_badge_ro, hero_badge_en,
  hero_tags_ro, hero_tags_en, hero_cta_primary_ro, hero_cta_primary_en,
  hero_cta_secondary_ro, hero_cta_secondary_en, updated_at
FROM public.site_settings
LIMIT 1;

-- Grant to the view owner (postgres) which has full access
ALTER VIEW public.public_site_settings OWNER TO postgres;
GRANT SELECT ON public.public_site_settings TO anon, authenticated;