ALTER TABLE public.blog_articles
  ADD COLUMN IF NOT EXISTS meta_title text,
  ADD COLUMN IF NOT EXISTS meta_description text,
  ADD COLUMN IF NOT EXISTS main_image_url text,
  ADD COLUMN IF NOT EXISTS geo_location text;

CREATE INDEX IF NOT EXISTS idx_blog_articles_geo_location
  ON public.blog_articles (geo_location)
  WHERE geo_location IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_blog_articles_published_at
  ON public.blog_articles (published_at DESC)
  WHERE is_published = true;