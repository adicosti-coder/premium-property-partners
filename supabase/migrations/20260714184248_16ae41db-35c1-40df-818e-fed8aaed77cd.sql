
-- 1. New columns
ALTER TABLE public.blog_articles
  ADD COLUMN IF NOT EXISTS faq_items JSONB,
  ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ;

COMMENT ON COLUMN public.blog_articles.faq_items IS
  'Optional curated FAQ list: [{"question":"...","answer":"..."}]. Consumed by ArticleFAQ + FAQPage JSON-LD.';
COMMENT ON COLUMN public.blog_articles.scheduled_for IS
  'If set in the future, the auto_publish_scheduled_articles cron flips is_published=true when now() >= scheduled_for.';

-- 2. Auto-publish function (SECURITY DEFINER — bypasses RLS to update publish state)
CREATE OR REPLACE FUNCTION public.auto_publish_scheduled_articles()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected INTEGER;
BEGIN
  WITH updated AS (
    UPDATE public.blog_articles
       SET is_published = TRUE,
           published_at = COALESCE(published_at, scheduled_for, now()),
           scheduled_for = NULL,
           updated_at = now()
     WHERE scheduled_for IS NOT NULL
       AND scheduled_for <= now()
       AND is_published = FALSE
    RETURNING id
  )
  SELECT COUNT(*) INTO affected FROM updated;
  RETURN affected;
END;
$$;

-- 3. Schedule via pg_cron (every 5 minutes)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('auto-publish-scheduled-articles')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto-publish-scheduled-articles');
    PERFORM cron.schedule(
      'auto-publish-scheduled-articles',
      '*/5 * * * *',
      $CRON$ SELECT public.auto_publish_scheduled_articles(); $CRON$
    );
  END IF;
END;
$$;
