
-- Keyword Radar: ecosistem integrat de descoperire + scraping pe baza căutărilor reale
CREATE TABLE IF NOT EXISTS public.keyword_radar_queries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword text NOT NULL,
  keyword_normalized text GENERATED ALWAYS AS (lower(trim(keyword))) STORED,
  source text NOT NULL CHECK (source IN ('onsite','gsc','auto_property','auto_zone','semrush','manual')),
  category text NOT NULL DEFAULT 'general' CHECK (category IN ('vanzare','inchiriere','cazare','investitie','ansamblu','general')),
  platforms text[] NOT NULL DEFAULT ARRAY['OLX','Storia.ro','imobiliare.ro']::text[],
  priority_score numeric NOT NULL DEFAULT 0,
  volume integer NOT NULL DEFAULT 0,        -- impressions/clicks/searches from source
  results_count integer NOT NULL DEFAULT 0, -- listings discovered last scan
  total_results_count integer NOT NULL DEFAULT 0,
  scan_count integer NOT NULL DEFAULT 0,
  last_scanned_at timestamptz,
  last_error text,
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS keyword_radar_queries_unique_norm
  ON public.keyword_radar_queries (keyword_normalized);
CREATE INDEX IF NOT EXISTS keyword_radar_queries_priority_idx
  ON public.keyword_radar_queries (priority_score DESC, last_scanned_at NULLS FIRST)
  WHERE is_active = true;
CREATE INDEX IF NOT EXISTS keyword_radar_queries_source_idx
  ON public.keyword_radar_queries (source);

ALTER TABLE public.keyword_radar_queries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage keyword radar"
  ON public.keyword_radar_queries FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER trg_keyword_radar_queries_updated_at
  BEFORE UPDATE ON public.keyword_radar_queries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Per-run audit log
CREATE TABLE IF NOT EXISTS public.keyword_radar_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_type text NOT NULL CHECK (run_type IN ('discover','scan')),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  duration_ms integer,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running','success','partial','failed')),
  triggered_by text NOT NULL DEFAULT 'cron',
  stats jsonb NOT NULL DEFAULT '{}'::jsonb,
  error text
);

ALTER TABLE public.keyword_radar_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read keyword radar runs"
  ON public.keyword_radar_runs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE INDEX IF NOT EXISTS keyword_radar_runs_started_idx
  ON public.keyword_radar_runs (started_at DESC);
