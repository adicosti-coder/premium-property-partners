DROP VIEW IF EXISTS public.public_site_settings;

CREATE TABLE IF NOT EXISTS public.public_site_settings (
  id text PRIMARY KEY,
  hero_video_url text,
  hero_video_filename text,
  hero_image_url text,
  hero_image_filename text,
  hero_title_ro text,
  hero_title_en text,
  hero_highlight_ro text,
  hero_highlight_en text,
  hero_subtitle_ro text,
  hero_subtitle_en text,
  hero_badge_ro text,
  hero_badge_en text,
  hero_tags_ro text[],
  hero_tags_en text[],
  hero_cta_primary_ro text,
  hero_cta_primary_en text,
  hero_cta_secondary_ro text,
  hero_cta_secondary_en text,
  updated_at timestamptz
);

ALTER TABLE public.public_site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read public site settings" ON public.public_site_settings;
CREATE POLICY "Anyone can read public site settings"
ON public.public_site_settings
FOR SELECT
TO anon, authenticated
USING (true);

INSERT INTO public.public_site_settings (
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
)
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
ON CONFLICT (id) DO UPDATE SET
  hero_video_url = EXCLUDED.hero_video_url,
  hero_video_filename = EXCLUDED.hero_video_filename,
  hero_image_url = EXCLUDED.hero_image_url,
  hero_image_filename = EXCLUDED.hero_image_filename,
  hero_title_ro = EXCLUDED.hero_title_ro,
  hero_title_en = EXCLUDED.hero_title_en,
  hero_highlight_ro = EXCLUDED.hero_highlight_ro,
  hero_highlight_en = EXCLUDED.hero_highlight_en,
  hero_subtitle_ro = EXCLUDED.hero_subtitle_ro,
  hero_subtitle_en = EXCLUDED.hero_subtitle_en,
  hero_badge_ro = EXCLUDED.hero_badge_ro,
  hero_badge_en = EXCLUDED.hero_badge_en,
  hero_tags_ro = EXCLUDED.hero_tags_ro,
  hero_tags_en = EXCLUDED.hero_tags_en,
  hero_cta_primary_ro = EXCLUDED.hero_cta_primary_ro,
  hero_cta_primary_en = EXCLUDED.hero_cta_primary_en,
  hero_cta_secondary_ro = EXCLUDED.hero_cta_secondary_ro,
  hero_cta_secondary_en = EXCLUDED.hero_cta_secondary_en,
  updated_at = EXCLUDED.updated_at;

CREATE OR REPLACE FUNCTION public.sync_public_site_settings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.public_site_settings (
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
  ) VALUES (
    NEW.id,
    NEW.hero_video_url,
    NEW.hero_video_filename,
    NEW.hero_image_url,
    NEW.hero_image_filename,
    NEW.hero_title_ro,
    NEW.hero_title_en,
    NEW.hero_highlight_ro,
    NEW.hero_highlight_en,
    NEW.hero_subtitle_ro,
    NEW.hero_subtitle_en,
    NEW.hero_badge_ro,
    NEW.hero_badge_en,
    NEW.hero_tags_ro,
    NEW.hero_tags_en,
    NEW.hero_cta_primary_ro,
    NEW.hero_cta_primary_en,
    NEW.hero_cta_secondary_ro,
    NEW.hero_cta_secondary_en,
    NEW.updated_at
  )
  ON CONFLICT (id) DO UPDATE SET
    hero_video_url = EXCLUDED.hero_video_url,
    hero_video_filename = EXCLUDED.hero_video_filename,
    hero_image_url = EXCLUDED.hero_image_url,
    hero_image_filename = EXCLUDED.hero_image_filename,
    hero_title_ro = EXCLUDED.hero_title_ro,
    hero_title_en = EXCLUDED.hero_title_en,
    hero_highlight_ro = EXCLUDED.hero_highlight_ro,
    hero_highlight_en = EXCLUDED.hero_highlight_en,
    hero_subtitle_ro = EXCLUDED.hero_subtitle_ro,
    hero_subtitle_en = EXCLUDED.hero_subtitle_en,
    hero_badge_ro = EXCLUDED.hero_badge_ro,
    hero_badge_en = EXCLUDED.hero_badge_en,
    hero_tags_ro = EXCLUDED.hero_tags_ro,
    hero_tags_en = EXCLUDED.hero_tags_en,
    hero_cta_primary_ro = EXCLUDED.hero_cta_primary_ro,
    hero_cta_primary_en = EXCLUDED.hero_cta_primary_en,
    hero_cta_secondary_ro = EXCLUDED.hero_cta_secondary_ro,
    hero_cta_secondary_en = EXCLUDED.hero_cta_secondary_en,
    updated_at = EXCLUDED.updated_at;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_public_site_settings() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS sync_public_site_settings_trigger ON public.site_settings;
CREATE TRIGGER sync_public_site_settings_trigger
AFTER INSERT OR UPDATE ON public.site_settings
FOR EACH ROW
EXECUTE FUNCTION public.sync_public_site_settings();