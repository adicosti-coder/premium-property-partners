-- 1. Add new columns to seo_overrides
ALTER TABLE public.seo_overrides
  ADD COLUMN IF NOT EXISTS json_ld jsonb,
  ADD COLUMN IF NOT EXISTS alt_text_suggestions jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS ab_variant_b jsonb,
  ADD COLUMN IF NOT EXISTS ab_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ab_winner text;

-- 2. History table
CREATE TABLE IF NOT EXISTS public.seo_override_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url_path text NOT NULL,
  version_number integer NOT NULL,
  title text,
  meta_description text,
  json_ld jsonb,
  extra_keywords jsonb DEFAULT '[]'::jsonb,
  alt_text_suggestions jsonb DEFAULT '[]'::jsonb,
  source_audit_id uuid REFERENCES public.seo_audits(id) ON DELETE SET NULL,
  score_before integer,
  score_after integer,
  change_type text NOT NULL DEFAULT 'full',
  applied_by uuid,
  applied_at timestamptz NOT NULL DEFAULT now(),
  reverted_at timestamptz,
  notes text,
  UNIQUE (url_path, version_number)
);

CREATE INDEX IF NOT EXISTS seo_override_history_url_idx
  ON public.seo_override_history (url_path, version_number DESC);

ALTER TABLE public.seo_override_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage seo_override_history"
  ON public.seo_override_history
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Service role manages seo_override_history"
  ON public.seo_override_history
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
