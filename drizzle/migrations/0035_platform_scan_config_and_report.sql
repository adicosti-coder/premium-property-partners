-- Per-platform scan configuration (keywords live in scraper_search_keywords)
CREATE TABLE IF NOT EXISTS public.platform_scan_config (
  platform text PRIMARY KEY,
  is_enabled boolean NOT NULL DEFAULT true,
  owner_only boolean NOT NULL DEFAULT true,
  min_price numeric,
  max_price numeric,
  min_rooms integer,
  max_rooms integer,
  zones text[] NOT NULL DEFAULT '{}',
  max_results integer NOT NULL DEFAULT 5,
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.platform_scan_config TO authenticated;
GRANT ALL ON public.platform_scan_config TO service_role;

ALTER TABLE public.platform_scan_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage platform scan config" ON public.platform_scan_config;
CREATE POLICY "Admins manage platform scan config"
ON public.platform_scan_config
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.platform_scan_config (platform)
VALUES ('OLX'), ('Storia.ro'), ('imobiliare.ro'), ('Publi24'), ('BursaImobiliara.ro')
ON CONFLICT (platform) DO NOTHING;

-- Per-platform report: volume, average price, monthly variation, efficiency
CREATE OR REPLACE FUNCTION public.get_platform_scan_report(p_days integer DEFAULT 30)
RETURNS TABLE(
  source_platform text,
  found_period bigint,
  with_phone bigint,
  duplicates bigint,
  agencies bigint,
  invalid_data bigint,
  avg_price numeric,
  avg_price_this_month numeric,
  avg_price_prev_month numeric,
  last_found_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    coalesce(pl.source_platform, 'Necunoscut')::text,
    count(*)::bigint,
    count(*) FILTER (WHERE pl.contact_phone IS NOT NULL AND pl.contact_phone <> '')::bigint,
    count(*) FILTER (WHERE pl.rejection_reason = 'duplicate')::bigint,
    count(*) FILTER (WHERE pl.rejection_reason ILIKE '%agenc%' OR pl.prospect_type = 'agency')::bigint,
    count(*) FILTER (WHERE pl.rejection_reason ILIKE 'invalid_data%')::bigint,
    round(avg(pl.price) FILTER (WHERE pl.price > 0))::numeric,
    round(avg(pl.price) FILTER (WHERE pl.price > 0 AND coalesce(pl.scraped_at, pl.created_at) >= date_trunc('month', now())))::numeric,
    round(avg(pl.price) FILTER (WHERE pl.price > 0
      AND coalesce(pl.scraped_at, pl.created_at) >= date_trunc('month', now()) - interval '1 month'
      AND coalesce(pl.scraped_at, pl.created_at) < date_trunc('month', now())))::numeric,
    max(coalesce(pl.scraped_at, pl.created_at))
  FROM public.prospect_listings pl
  WHERE coalesce(pl.scraped_at, pl.created_at) > now() - (greatest(p_days, 1) || ' days')::interval
    AND public.has_role(auth.uid(), 'admin')
  GROUP BY 1
  ORDER BY 2 DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_platform_scan_report(integer) TO authenticated;