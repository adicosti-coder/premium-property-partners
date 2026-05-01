CREATE TABLE IF NOT EXISTS public.seo_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url_path TEXT NOT NULL UNIQUE,
  title TEXT,
  meta_description TEXT,
  extra_keywords JSONB DEFAULT '[]'::jsonb,
  structural_todos JSONB DEFAULT '[]'::jsonb,
  source_audit_id UUID REFERENCES public.seo_audits(id) ON DELETE SET NULL,
  applied_by UUID,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS seo_overrides_url_idx ON public.seo_overrides(url_path) WHERE is_active = true;

ALTER TABLE public.seo_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active seo_overrides"
  ON public.seo_overrides FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins manage seo_overrides"
  ON public.seo_overrides FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role manages seo_overrides"
  ON public.seo_overrides FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE TRIGGER seo_overrides_updated_at
  BEFORE UPDATE ON public.seo_overrides
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();