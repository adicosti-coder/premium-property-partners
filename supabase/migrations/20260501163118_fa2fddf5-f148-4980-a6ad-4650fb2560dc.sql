-- Cache for robots.txt (24h refresh) and audit log for canonical fixes

CREATE TABLE IF NOT EXISTS public.seo_robots_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  host TEXT NOT NULL UNIQUE,
  raw_content TEXT NOT NULL,
  parsed_rules JSONB NOT NULL DEFAULT '[]'::jsonb,
  sitemap_urls TEXT[] NOT NULL DEFAULT '{}',
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours'),
  http_status INTEGER,
  fetch_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_seo_robots_cache_host ON public.seo_robots_cache(host);
CREATE INDEX IF NOT EXISTS idx_seo_robots_cache_expires ON public.seo_robots_cache(expires_at);

ALTER TABLE public.seo_robots_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read robots cache"
  ON public.seo_robots_cache FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage robots cache"
  ON public.seo_robots_cache FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_seo_robots_cache_updated_at
  BEFORE UPDATE ON public.seo_robots_cache
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Canonical fix audit log (tracks one-click fixes & manual overrides)
CREATE TABLE IF NOT EXISTS public.seo_canonical_fix_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  url_path TEXT NOT NULL,
  previous_canonical TEXT,
  new_canonical TEXT NOT NULL,
  fix_source TEXT NOT NULL CHECK (fix_source IN ('one_click_single','one_click_bulk','manual_override','ai_generated','ai_with_override')),
  conflicts_detected JSONB DEFAULT '[]'::jsonb,
  conflict_overridden BOOLEAN NOT NULL DEFAULT false,
  override_reason TEXT,
  applied_by UUID,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_seo_canonical_fix_log_path ON public.seo_canonical_fix_log(url_path);
CREATE INDEX IF NOT EXISTS idx_seo_canonical_fix_log_applied_at ON public.seo_canonical_fix_log(applied_at DESC);

ALTER TABLE public.seo_canonical_fix_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read canonical fix log"
  ON public.seo_canonical_fix_log FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert canonical fix log"
  ON public.seo_canonical_fix_log FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));