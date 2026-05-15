CREATE TABLE public.seo_indexing_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  site TEXT NOT NULL,
  checked_pages INT NOT NULL DEFAULT 0,
  issues_count INT NOT NULL DEFAULT 0,
  issues JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.seo_indexing_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view indexing snapshots"
ON public.seo_indexing_snapshots FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert indexing snapshots"
ON public.seo_indexing_snapshots FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_seo_indexing_snapshots_created ON public.seo_indexing_snapshots(created_at DESC);