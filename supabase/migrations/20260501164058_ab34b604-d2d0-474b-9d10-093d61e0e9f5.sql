-- Robots cache log: tracks every fetch, invalidation, and expiration event
CREATE TABLE IF NOT EXISTS public.seo_robots_cache_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  host TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('fetch_success','fetch_error','cache_hit','cache_expired','manual_invalidation','manual_refresh','content_changed')),
  http_status INTEGER,
  fetch_error TEXT,
  raw_size INTEGER,
  rules_count INTEGER,
  sitemaps_count INTEGER,
  content_hash TEXT,
  previous_content_hash TEXT,
  triggered_by UUID,
  trigger_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_seo_robots_cache_log_host ON public.seo_robots_cache_log(host);
CREATE INDEX IF NOT EXISTS idx_seo_robots_cache_log_created ON public.seo_robots_cache_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_seo_robots_cache_log_event ON public.seo_robots_cache_log(event_type);

ALTER TABLE public.seo_robots_cache_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read robots cache log"
  ON public.seo_robots_cache_log FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert robots cache log"
  ON public.seo_robots_cache_log FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Add content_hash to cache for change detection
ALTER TABLE public.seo_robots_cache 
  ADD COLUMN IF NOT EXISTS content_hash TEXT,
  ADD COLUMN IF NOT EXISTS last_change_detected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS fetch_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS invalidation_count INTEGER NOT NULL DEFAULT 0;