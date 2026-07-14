
-- 1. Blog AI snapshots table
CREATE TABLE public.blog_ai_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id UUID NOT NULL REFERENCES public.blog_articles(id) ON DELETE CASCADE,
  triggered_by TEXT NOT NULL DEFAULT 'ai_pilot',
  previous_state JSONB NOT NULL,
  applied_changes JSONB NOT NULL DEFAULT '{}'::jsonb,
  confidence_score NUMERIC(5,2),
  ai_model TEXT,
  rationale TEXT,
  rolled_back_at TIMESTAMPTZ,
  rolled_back_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_blog_ai_snapshots_article ON public.blog_ai_snapshots(article_id, created_at DESC);
CREATE INDEX idx_blog_ai_snapshots_active ON public.blog_ai_snapshots(article_id) WHERE rolled_back_at IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.blog_ai_snapshots TO authenticated;
GRANT ALL ON public.blog_ai_snapshots TO service_role;

ALTER TABLE public.blog_ai_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage blog AI snapshots"
  ON public.blog_ai_snapshots
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 2. Extend blog_articles
ALTER TABLE public.blog_articles
  ADD COLUMN IF NOT EXISTS ai_last_optimized_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ai_confidence_score NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS ai_pending_review BOOLEAN NOT NULL DEFAULT false;

-- 3. Rollback RPC
CREATE OR REPLACE FUNCTION public.blog_rollback_ai_snapshot(_snapshot_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _snap RECORD;
  _prev JSONB;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'access_denied';
  END IF;

  SELECT * INTO _snap FROM public.blog_ai_snapshots WHERE id = _snapshot_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'snapshot_not_found';
  END IF;
  IF _snap.rolled_back_at IS NOT NULL THEN
    RAISE EXCEPTION 'already_rolled_back';
  END IF;

  _prev := _snap.previous_state;

  UPDATE public.blog_articles
     SET title            = COALESCE(_prev->>'title', title),
         meta_title       = _prev->>'meta_title',
         meta_description = _prev->>'meta_description',
         title_en         = _prev->>'title_en',
         excerpt_en       = _prev->>'excerpt_en',
         content_en       = _prev->>'content_en',
         content          = COALESCE(_prev->>'content', content),
         ai_last_optimized_at = NULL,
         ai_confidence_score = NULL,
         ai_pending_review = false,
         updated_at = now()
   WHERE id = _snap.article_id;

  UPDATE public.blog_ai_snapshots
     SET rolled_back_at = now(),
         rolled_back_by = auth.uid()
   WHERE id = _snapshot_id;

  RETURN jsonb_build_object('success', true, 'article_id', _snap.article_id);
END;
$$;

REVOKE ALL ON FUNCTION public.blog_rollback_ai_snapshot(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.blog_rollback_ai_snapshot(UUID) TO authenticated;

-- 4. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.blog_ai_snapshots;
