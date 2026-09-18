ALTER TABLE public.my_listings ADD COLUMN IF NOT EXISTS image_url text;

ALTER TABLE public.prospect_listings ADD COLUMN IF NOT EXISTS price_checked_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_prospect_listings_price_checked
  ON public.prospect_listings (price_checked_at NULLS FIRST)
  WHERE is_active = true;

CREATE OR REPLACE FUNCTION public.get_platform_scan_report_v2(p_days integer DEFAULT 30)
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
  avg_price_sqm numeric,
  avg_sqm_this_month numeric,
  avg_sqm_prev_month numeric,
  last_found_at timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH base AS (
    SELECT
      coalesce(pl.source_platform, 'Necunoscut')::text AS platform,
      pl.price,
      CASE WHEN pl.price > 0 AND pl.size > 0 THEN pl.price / pl.size END AS price_sqm,
      pl.contact_phone,
      pl.rejection_reason,
      pl.prospect_type,
      coalesce(pl.scraped_at, pl.created_at) AS seen_at
    FROM public.prospect_listings pl
    WHERE coalesce(pl.scraped_at, pl.created_at) > LEAST(
            now() - (greatest(p_days, 1) || ' days')::interval,
            date_trunc('month', now()) - interval '1 month'
          )
      AND public.has_role(auth.uid(), 'admin')
  ), period AS (
    SELECT * FROM base WHERE seen_at > now() - (greatest(p_days, 1) || ' days')::interval
  )
  SELECT
    b.platform,
    (SELECT count(*) FROM period p WHERE p.platform = b.platform)::bigint,
    (SELECT count(*) FROM period p WHERE p.platform = b.platform AND p.contact_phone IS NOT NULL AND p.contact_phone <> '')::bigint,
    (SELECT count(*) FROM period p WHERE p.platform = b.platform AND p.rejection_reason = 'duplicate')::bigint,
    (SELECT count(*) FROM period p WHERE p.platform = b.platform AND (p.rejection_reason ILIKE '%agenc%' OR p.prospect_type = 'agency'))::bigint,
    (SELECT count(*) FROM period p WHERE p.platform = b.platform AND p.rejection_reason ILIKE 'invalid_data%')::bigint,
    round(avg(b.price) FILTER (WHERE b.price > 0 AND b.seen_at > now() - (greatest(p_days, 1) || ' days')::interval))::numeric,
    round(avg(b.price) FILTER (WHERE b.price > 0 AND b.seen_at >= date_trunc('month', now())))::numeric,
    round(avg(b.price) FILTER (WHERE b.price > 0
      AND b.seen_at >= date_trunc('month', now()) - interval '1 month'
      AND b.seen_at < date_trunc('month', now())))::numeric,
    round(avg(b.price_sqm) FILTER (WHERE b.price_sqm IS NOT NULL AND b.seen_at > now() - (greatest(p_days, 1) || ' days')::interval))::numeric,
    round(avg(b.price_sqm) FILTER (WHERE b.price_sqm IS NOT NULL AND b.seen_at >= date_trunc('month', now())))::numeric,
    round(avg(b.price_sqm) FILTER (WHERE b.price_sqm IS NOT NULL
      AND b.seen_at >= date_trunc('month', now()) - interval '1 month'
      AND b.seen_at < date_trunc('month', now())))::numeric,
    max(b.seen_at) FILTER (WHERE b.seen_at > now() - (greatest(p_days, 1) || ' days')::interval)
  FROM base b
  GROUP BY b.platform
  ORDER BY 2 DESC;
$function$;

REVOKE ALL ON FUNCTION public.get_platform_scan_report_v2(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_platform_scan_report_v2(integer) TO authenticated, service_role;

SELECT cron.unschedule('refresh-published-prices')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'refresh-published-prices');

SELECT cron.schedule(
  'refresh-published-prices',
  '25 */6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://mvzssjyzbwccioqvhjpo.supabase.co/functions/v1/refresh-published-prices',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', public.get_cron_reconcile_secret()
    ),
    body := jsonb_build_object('limit', 60, 'trigger', 'cron')
  );
  $$
);