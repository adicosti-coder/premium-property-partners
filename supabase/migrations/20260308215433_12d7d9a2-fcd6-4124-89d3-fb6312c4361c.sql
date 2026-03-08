-- 1. Fix email_ab_tests: restrict to service_role only
DROP POLICY IF EXISTS "Service role can read A/B tests" ON public.email_ab_tests;
CREATE POLICY "Service role can read A/B tests"
ON public.email_ab_tests
FOR SELECT
TO service_role
USING (true);

-- 2. Fix shared_poi_links: remove blanket public read
DROP POLICY IF EXISTS "Anyone can read shared links by code" ON public.shared_poi_links;

-- 3. Fix site_settings: restrict main table to admins, create public view for hero data
DROP POLICY IF EXISTS "Anyone can view site settings" ON public.site_settings;

CREATE POLICY "Only admins can view site settings"
ON public.site_settings
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE VIEW public.public_site_settings
WITH (security_invoker = true) AS
SELECT 
  id, hero_video_url, hero_video_filename, hero_image_url, hero_image_filename,
  hero_title_ro, hero_title_en, hero_highlight_ro, hero_highlight_en,
  hero_subtitle_ro, hero_subtitle_en, hero_badge_ro, hero_badge_en,
  hero_tags_ro, hero_tags_en, hero_cta_primary_ro, hero_cta_primary_en,
  hero_cta_secondary_ro, hero_cta_secondary_en, updated_at
FROM public.site_settings
LIMIT 1;

GRANT SELECT ON public.public_site_settings TO anon, authenticated;

-- Create RLS-friendly function for shared POI link lookup by code
CREATE OR REPLACE FUNCTION public.get_shared_poi_link(p_share_code text)
RETURNS SETOF public.shared_poi_links
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.shared_poi_links WHERE share_code = p_share_code LIMIT 1;
$$;
