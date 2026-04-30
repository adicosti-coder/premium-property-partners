-- Restrict direct reads of internal site settings while keeping the public Hero view usable
DROP POLICY IF EXISTS "Anyone can read site settings" ON public.site_settings;
DROP POLICY IF EXISTS "Admins can read site settings" ON public.site_settings;

CREATE POLICY "Admins can read site settings"
ON public.site_settings
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Ensure the public view exposes only non-sensitive Hero content
CREATE OR REPLACE VIEW public.public_site_settings AS
SELECT
  id,
  hero_video_url,
  hero_video_filename,
  hero_image_url,
  hero_image_filename,
  hero_title_ro,
  hero_title_en,
  hero_highlight_ro,
  hero_highlight_en,
  hero_subtitle_ro,
  hero_subtitle_en,
  hero_badge_ro,
  hero_badge_en,
  hero_tags_ro,
  hero_tags_en,
  hero_cta_primary_ro,
  hero_cta_primary_en,
  hero_cta_secondary_ro,
  hero_cta_secondary_en,
  updated_at
FROM public.site_settings
LIMIT 1;

GRANT SELECT ON public.public_site_settings TO anon, authenticated;

-- Remove private / restricted tables from the global realtime publication.
-- The app already fetches these through RLS-filtered queries; removing broadcasts prevents channel-level data leakage.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'user_notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.user_notifications;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'property_views'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.property_views;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'poi_import_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.poi_import_events;
  END IF;
END $$;