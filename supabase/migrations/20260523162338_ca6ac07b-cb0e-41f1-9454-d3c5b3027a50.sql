
CREATE TABLE IF NOT EXISTS public.listing_import_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at timestamptz NOT NULL DEFAULT now(),
  triggered_by text,
  candidates int DEFAULT 0,
  scraped int DEFAULT 0,
  published int DEFAULT 0,
  rejected_refusal int DEFAULT 0,
  rejected_no_content int DEFAULT 0,
  rejected_duplicate int DEFAULT 0,
  rejected_error int DEFAULT 0,
  rejected_low_quality int DEFAULT 0,
  rejected_source_disabled int DEFAULT 0,
  avg_quality_score numeric,
  ai_rewrite_used boolean DEFAULT true,
  batch_size int,
  duration_ms int,
  errors_sample jsonb DEFAULT '[]'::jsonb,
  per_source jsonb DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_lim_run_at ON public.listing_import_metrics(run_at DESC);

CREATE TABLE IF NOT EXISTS public.listing_import_learnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_type text NOT NULL CHECK (pattern_type IN ('phrase','title_hint','description_hint','source_blacklist')),
  pattern text NOT NULL,
  evidence_count int DEFAULT 1,
  confidence numeric DEFAULT 0.3,
  is_active boolean DEFAULT false,
  promoted_at timestamptz,
  notes text,
  first_seen timestamptz NOT NULL DEFAULT now(),
  last_seen timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pattern_type, pattern)
);
CREATE INDEX IF NOT EXISTS idx_lil_active ON public.listing_import_learnings(is_active, pattern_type);

CREATE TABLE IF NOT EXISTS public.listing_import_review_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('approve','edit','reject')),
  reviewer_id uuid,
  ai_title text,
  ai_description text,
  final_title text,
  final_description text,
  reason text,
  diff_tokens_removed jsonb DEFAULT '[]'::jsonb,
  source_platform text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lire_prop ON public.listing_import_review_events(property_id);
CREATE INDEX IF NOT EXISTS idx_lire_created ON public.listing_import_review_events(created_at DESC);

CREATE TABLE IF NOT EXISTS public.listing_import_source_health (
  source_platform text PRIMARY KEY,
  total_attempts int DEFAULT 0,
  total_published int DEFAULT 0,
  total_rejected int DEFAULT 0,
  total_approved int DEFAULT 0,
  total_edited int DEFAULT 0,
  total_user_rejected int DEFAULT 0,
  last_success_at timestamptz,
  last_failure_at timestamptz,
  consecutive_failures int DEFAULT 0,
  auto_disabled_until timestamptz,
  approval_rate numeric DEFAULT 0,
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.listing_import_heal_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  decided_at timestamptz NOT NULL DEFAULT now(),
  decision text NOT NULL,
  rationale text,
  payload jsonb DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_lihl_decided ON public.listing_import_heal_log(decided_at DESC);

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS quality_score numeric,
  ADD COLUMN IF NOT EXISTS review_action text,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

ALTER TABLE public.listing_import_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_import_learnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_import_review_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_import_source_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_import_heal_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "admin all listing_import_metrics" ON public.listing_import_metrics
    FOR ALL USING (public.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "admin all listing_import_learnings" ON public.listing_import_learnings
    FOR ALL USING (public.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "admin all listing_import_review_events" ON public.listing_import_review_events
    FOR ALL USING (public.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "admin all listing_import_source_health" ON public.listing_import_source_health
    FOR ALL USING (public.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "admin all listing_import_heal_log" ON public.listing_import_heal_log
    FOR ALL USING (public.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION public.listing_import_record_review(
  _source_platform text,
  _action text,
  _quality_delta int DEFAULT 0
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.listing_import_source_health (source_platform, total_attempts)
    VALUES (COALESCE(_source_platform,'unknown'), 0)
  ON CONFLICT (source_platform) DO NOTHING;

  UPDATE public.listing_import_source_health
  SET
    total_approved   = total_approved   + CASE WHEN _action='approve' THEN 1 ELSE 0 END,
    total_edited     = total_edited     + CASE WHEN _action='edit'    THEN 1 ELSE 0 END,
    total_user_rejected = total_user_rejected + CASE WHEN _action='reject' THEN 1 ELSE 0 END,
    consecutive_failures = CASE WHEN _action='reject' THEN consecutive_failures + 1 ELSE 0 END,
    last_success_at = CASE WHEN _action IN ('approve','edit') THEN now() ELSE last_success_at END,
    last_failure_at = CASE WHEN _action='reject' THEN now() ELSE last_failure_at END,
    approval_rate = ROUND(
      ((total_approved + CASE WHEN _action='approve' THEN 1 ELSE 0 END)::numeric
      / GREATEST(1, total_approved + total_edited + total_user_rejected + 1)::numeric) * 100, 1),
    updated_at = now()
  WHERE source_platform = COALESCE(_source_platform,'unknown');
END;
$$;

INSERT INTO public.automation_jobs (job_key, category, label, description, schedule, trigger_type, enabled, config)
VALUES (
  'listing-import-self-heal',
  'system',
  'Listing Import Self-Heal',
  'Analizează metricile pipeline-ului auto-publish, dezactivează surse problematice, promovează learnings noi și autoreglează parametrii.',
  '*/30 * * * *',
  'cron',
  true,
  '{"timeout_ms": 30000, "max_retries": 1}'::jsonb
)
ON CONFLICT (job_key) DO UPDATE
  SET label = EXCLUDED.label,
      description = EXCLUDED.description,
      schedule = EXCLUDED.schedule,
      config = EXCLUDED.config;
