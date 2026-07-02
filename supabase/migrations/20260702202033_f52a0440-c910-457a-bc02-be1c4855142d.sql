ALTER TABLE public.seo_guides
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.seo_guides(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_seo_guides_parent ON public.seo_guides(parent_id, version DESC);