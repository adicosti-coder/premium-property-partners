-- SEO AI Optimizer reliability: inflight dedup lock + composite indexes for cache lookups

CREATE TABLE IF NOT EXISTS public.seo_audit_inflight (
  url text NOT NULL,
  language text NOT NULL DEFAULT 'ro',
  started_at timestamptz NOT NULL DEFAULT now(),
  triggered_by text,
  PRIMARY KEY (url, language)
);

GRANT SELECT ON public.seo_audit_inflight TO authenticated;
GRANT ALL ON public.seo_audit_inflight TO service_role;

ALTER TABLE public.seo_audit_inflight ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view inflight audits" ON public.seo_audit_inflight;
CREATE POLICY "Admins can view inflight audits" ON public.seo_audit_inflight
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Composite index for fast (url, language, created_at) cache lookups
CREATE INDEX IF NOT EXISTS seo_audits_url_lang_created_idx
  ON public.seo_audits(url, language, created_at DESC);

CREATE INDEX IF NOT EXISTS seo_audits_hash_lang_idx
  ON public.seo_audits(content_hash, language, created_at DESC);

-- Atomic lock acquisition. Returns TRUE if caller obtained the lock,
-- FALSE if another worker already holds a fresh (< ttl) lock on the URL.
CREATE OR REPLACE FUNCTION public.seo_acquire_audit_lock(
  p_url text,
  p_language text DEFAULT 'ro',
  p_ttl_seconds int DEFAULT 90,
  p_triggered_by text DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing timestamptz;
BEGIN
  -- Clean stale rows (older than TTL) in a single pass
  DELETE FROM public.seo_audit_inflight
  WHERE started_at < now() - make_interval(secs => p_ttl_seconds);

  -- Try to insert; conflict means a fresh lock exists
  INSERT INTO public.seo_audit_inflight(url, language, triggered_by)
  VALUES (p_url, p_language, p_triggered_by)
  ON CONFLICT (url, language) DO NOTHING
  RETURNING started_at INTO v_existing;

  RETURN v_existing IS NOT NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.seo_release_audit_lock(
  p_url text,
  p_language text DEFAULT 'ro'
) RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.seo_audit_inflight WHERE url = p_url AND language = p_language;
$$;