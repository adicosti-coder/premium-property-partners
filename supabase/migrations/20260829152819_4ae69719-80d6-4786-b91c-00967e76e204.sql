CREATE TABLE IF NOT EXISTS public.sitemap_cache (
  cache_key text PRIMARY KEY,
  body text NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.sitemap_cache TO service_role;
ALTER TABLE public.sitemap_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "No client access to sitemap cache" ON public.sitemap_cache;
CREATE POLICY "No client access to sitemap cache"
ON public.sitemap_cache FOR SELECT TO authenticated
USING (false);