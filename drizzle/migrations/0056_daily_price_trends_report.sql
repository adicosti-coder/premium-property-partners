CREATE OR REPLACE FUNCTION public.get_daily_price_trends(p_days integer DEFAULT 14)
RETURNS TABLE (
  day date,
  listings_count bigint,
  avg_price numeric,
  avg_price_per_sqm numeric,
  avg_source_days numeric,
  drops_count bigint,
  avg_drop_pct numeric,
  max_drop_pct numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH d AS (
    SELECT generate_series(
      (now() AT TIME ZONE 'Europe/Bucharest')::date - (GREATEST(COALESCE(p_days,14),1) - 1),
      (now() AT TIME ZONE 'Europe/Bucharest')::date,
      interval '1 day'
    )::date AS day
  ),
  h AS (
    SELECT (ph.recorded_at AT TIME ZONE 'Europe/Bucharest')::date AS day,
           count(*) AS listings_count,
           avg(ph.price) AS avg_price,
           avg(CASE WHEN ph.surface > 5 THEN ph.price / ph.surface END) AS avg_price_per_sqm,
           avg(EXTRACT(EPOCH FROM (ph.recorded_at - pl.created_at)) / 86400.0) AS avg_source_days
    FROM public.prospect_price_history ph
    LEFT JOIN public.prospect_listings pl ON pl.id = ph.listing_id
    WHERE ph.recorded_at >= (now() - make_interval(days => GREATEST(COALESCE(p_days,14),1)))
      AND ph.price BETWEEN 3000 AND 3000000
    GROUP BY 1
  ),
  a AS (
    SELECT (pa.recorded_at AT TIME ZONE 'Europe/Bucharest')::date AS day,
           count(*) AS drops_count,
           avg(pa.drop_pct) AS avg_drop_pct,
           max(pa.drop_pct) AS max_drop_pct
    FROM public.prospect_price_drop_alerts pa
    WHERE pa.recorded_at >= (now() - make_interval(days => GREATEST(COALESCE(p_days,14),1)))
    GROUP BY 1
  )
  SELECT d.day,
         COALESCE(h.listings_count, 0),
         round(h.avg_price, 0),
         round(h.avg_price_per_sqm, 0),
         round(h.avg_source_days, 1),
         COALESCE(a.drops_count, 0),
         round(a.avg_drop_pct, 1),
         round(a.max_drop_pct, 1)
  FROM d
  LEFT JOIN h ON h.day = d.day
  LEFT JOIN a ON a.day = d.day
  ORDER BY d.day DESC;
$$;

REVOKE ALL ON FUNCTION public.get_daily_price_trends(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_daily_price_trends(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_daily_price_trends(integer) TO service_role;