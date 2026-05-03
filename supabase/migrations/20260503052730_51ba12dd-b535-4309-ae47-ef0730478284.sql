
CREATE TABLE IF NOT EXISTS public.seo_content_briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url_path TEXT NOT NULL,
  competitor_url TEXT,
  h2_title TEXT NOT NULL,
  draft_content TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  generated_by UUID,
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_seo_content_briefs_url ON public.seo_content_briefs(url_path);

ALTER TABLE public.seo_content_briefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage content briefs"
ON public.seo_content_briefs
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER update_seo_content_briefs_updated_at
BEFORE UPDATE ON public.seo_content_briefs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
