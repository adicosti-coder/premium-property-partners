CREATE TABLE IF NOT EXISTS public.seo_alert_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  min_404_hits integer NOT NULL DEFAULT 5 CHECK (min_404_hits BETWEEN 2 AND 1000),
  min_indexing_issues integer NOT NULL DEFAULT 1 CHECK (min_indexing_issues BETWEEN 1 AND 10000),
  webhook_min_severity text NOT NULL DEFAULT 'warning' CHECK (webhook_min_severity IN ('warning','error')),
  email_enabled boolean NOT NULL DEFAULT true,
  webhook_enabled boolean NOT NULL DEFAULT true,
  auto_reindex_on_alert boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

GRANT SELECT, INSERT, UPDATE ON public.seo_alert_settings TO authenticated;
GRANT ALL ON public.seo_alert_settings TO service_role;
ALTER TABLE public.seo_alert_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage seo alert settings" ON public.seo_alert_settings;
CREATE POLICY "Admins manage seo alert settings"
ON public.seo_alert_settings FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.seo_alert_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.get_sitemap_status()
RETURNS TABLE (cache_key text, generated_at timestamptz, url_count integer, bytes integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sc.cache_key,
         sc.generated_at,
         (length(sc.body) - length(replace(sc.body, '<loc>', '')))::integer / 5 AS url_count,
         length(sc.body)::integer AS bytes
  FROM public.sitemap_cache sc
  WHERE public.has_role(auth.uid(), 'admin')
  ORDER BY sc.cache_key
$$;

REVOKE ALL ON FUNCTION public.get_sitemap_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_sitemap_status() TO authenticated;