ALTER TABLE public.blog_articles
  ADD COLUMN IF NOT EXISTS translation_locked boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.blog_articles.translation_locked IS
  'When true, automatic AI translation functions skip this article to preserve manual edits to title_en/excerpt_en/content_en.';