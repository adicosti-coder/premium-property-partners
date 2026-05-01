-- A/B variant metrics (one row per (path, variant, day))
CREATE TABLE IF NOT EXISTS public.seo_ab_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  url_path TEXT NOT NULL,
  variant TEXT NOT NULL CHECK (variant IN ('A','B')),
  day DATE NOT NULL DEFAULT CURRENT_DATE,
  impressions INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  ctr NUMERIC(6,4),
  source TEXT NOT NULL DEFAULT 'internal_views',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (url_path, variant, day, source)
);
CREATE INDEX IF NOT EXISTS idx_seo_ab_metrics_path ON public.seo_ab_metrics(url_path, day DESC);
ALTER TABLE public.seo_ab_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage ab metrics" ON public.seo_ab_metrics
  FOR ALL USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

-- Competitor snapshots
CREATE TABLE IF NOT EXISTS public.seo_competitor_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  our_url_path TEXT NOT NULL,
  competitor_url TEXT NOT NULL,
  competitor_label TEXT,
  competitor_title TEXT,
  competitor_meta TEXT,
  competitor_h1 TEXT,
  competitor_schema_types JSONB DEFAULT '[]'::jsonb,
  competitor_word_count INTEGER,
  ai_gaps JSONB DEFAULT '[]'::jsonb,
  ai_summary TEXT,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_seo_competitor_path ON public.seo_competitor_snapshots(our_url_path, fetched_at DESC);
ALTER TABLE public.seo_competitor_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage competitor snapshots" ON public.seo_competitor_snapshots
  FOR ALL USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

-- Internal link suggestions
CREATE TABLE IF NOT EXISTS public.seo_internal_link_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_url_path TEXT NOT NULL,
  target_url_path TEXT NOT NULL,
  anchor_text TEXT NOT NULL,
  reason TEXT,
  relevance_score INTEGER,
  status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed','applied','dismissed')),
  applied_at TIMESTAMPTZ,
  applied_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_seo_internal_links_source ON public.seo_internal_link_suggestions(source_url_path, status);
ALTER TABLE public.seo_internal_link_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage link suggestions" ON public.seo_internal_link_suggestions
  FOR ALL USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

-- Schema validations history
CREATE TABLE IF NOT EXISTS public.seo_schema_validations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  url_path TEXT NOT NULL,
  override_id UUID REFERENCES public.seo_overrides(id) ON DELETE SET NULL,
  history_id UUID REFERENCES public.seo_override_history(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('valid','warnings','invalid','error')),
  errors JSONB DEFAULT '[]'::jsonb,
  warnings JSONB DEFAULT '[]'::jsonb,
  schema_types JSONB DEFAULT '[]'::jsonb,
  validator TEXT NOT NULL DEFAULT 'internal_jsonld',
  raw_response JSONB,
  validated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_seo_schema_val_path ON public.seo_schema_validations(url_path, validated_at DESC);
ALTER TABLE public.seo_schema_validations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage schema validations" ON public.seo_schema_validations
  FOR ALL USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

-- Extra columns on overrides + history
ALTER TABLE public.seo_overrides
  ADD COLUMN IF NOT EXISTS last_validated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_validation_status TEXT,
  ADD COLUMN IF NOT EXISTS ab_winner_resolved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ab_resolved_by TEXT;

ALTER TABLE public.seo_override_history
  ADD COLUMN IF NOT EXISTS validation_status TEXT;