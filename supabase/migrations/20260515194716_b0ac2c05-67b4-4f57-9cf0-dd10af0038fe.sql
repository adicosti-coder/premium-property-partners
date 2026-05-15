
ALTER TABLE public.seo_overrides
  ADD COLUMN IF NOT EXISTS pending_review boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_generated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_model text,
  ADD COLUMN IF NOT EXISTS ai_generated_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_seo_overrides_pending
  ON public.seo_overrides (created_at DESC)
  WHERE pending_review = true;
