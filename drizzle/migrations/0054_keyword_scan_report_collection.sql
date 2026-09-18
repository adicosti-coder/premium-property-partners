CREATE OR REPLACE FUNCTION public.get_keyword_scan_report_v3(
  p_days integer DEFAULT 30,
  p_platform text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  keyword text,
  platform text,
  collection text,
  is_active boolean,
  found_period bigint,
  with_phone bigint,
  avg_price numeric,
  last_found_at timestamptz,
  success_count integer,
  fail_count integer,
  consecutive_zero integer,
  unique_leads_count integer,
  last_success_at timestamptz,
  top_zone text,
  zone_avg_price numeric,
  zone_avg_price_prev numeric,
  zone_variation_pct numeric,
  zone_avg_sqm numeric,
  site_zone_count bigint,
  site_zone_avg_price numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH kw AS (
    SELECT k.*
    FROM public.scraper_search_keywords k
    WHERE (p_platform IS NULL OR COALESCE(NULLIF(k.platform, ''), 'toate') IN (p_platform, 'toate'))
  ),
  coll AS (
    SELECT DISTINCT ON (lower(q.keyword))
      lower(q.keyword) AS kwl,
      NULLIF(q.metadata->>'collection', '') AS collection
    FROM public.keyword_radar_queries q
    WHERE NULLIF(q.metadata->>'collection', '') IS NOT NULL
    ORDER BY lower(q.keyword), q.is_active DESC, q.updated_at DESC NULLS LAST
  ),
  matched AS (
    SELECT
      kw.id AS kid,
      p.zone,
      p.price,
      p.size,
      p.created_at,
      COALESCE(p.phone_normalized, p.contact_phone) AS phone
    FROM kw
    JOIN public.prospect_listings p
      ON p.search_keywords IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM unnest(p.search_keywords) AS sk
       WHERE lower(sk) = lower(kw.keyword)
          OR lower(sk) LIKE lower(kw.keyword) || ' site:%'
     )
    WHERE p.created_at >= now() - make_interval(days => GREATEST(p_days, 1))
      AND (p_platform IS NULL OR p.source_platform = p_platform)
  ),
  agg AS (
    SELECT
      kid,
      count(*) AS found_period,
      count(*) FILTER (WHERE phone IS NOT NULL) AS with_phone,
      round(avg(NULLIF(price, 0))) AS avg_price,
      max(created_at) AS last_found_at
    FROM matched
    GROUP BY kid
  ),
  zonecounts AS (
    SELECT kid, zone, count(*) AS n
    FROM matched
    WHERE zone IS NOT NULL AND zone <> ''
    GROUP BY kid, zone
  ),
  topzone AS (
    SELECT DISTINCT ON (kid) kid, zone
    FROM zonecounts
    ORDER BY kid, n DESC, zone
  ),
  zonestats AS (
    SELECT
      t.kid,
      t.zone,
      round(avg(NULLIF(p.price, 0)) FILTER (
        WHERE p.created_at >= date_trunc('month', now())
      )) AS cur_avg,
      round(avg(NULLIF(p.price, 0)) FILTER (
        WHERE p.created_at >= date_trunc('month', now()) - interval '1 month'
          AND p.created_at < date_trunc('month', now())
      )) AS prev_avg,
      round(avg(NULLIF(p.price, 0) / NULLIF(p.size, 0)) FILTER (WHERE p.size > 10)) AS avg_sqm
    FROM topzone t
    JOIN public.prospect_listings p
      ON public.zone_norm(COALESCE(p.zone, '')) = public.zone_norm(t.zone)
    WHERE p.created_at >= date_trunc('month', now()) - interval '1 month'
      AND COALESCE(p.price, 0) BETWEEN 3000 AND 3000000
    GROUP BY t.kid, t.zone
  ),
  sitestats AS (
    SELECT
      t.kid,
      count(*) AS site_count,
      round(avg(pr.capital_necesar)) AS site_avg
    FROM topzone t
    JOIN public.properties pr
      ON pr.is_active = true
     AND pr.capital_necesar BETWEEN 3000 AND 3000000
     AND length(public.zone_norm(t.zone)) > 3
     AND public.zone_norm(pr.location) LIKE '%' || public.zone_norm(t.zone) || '%'
    GROUP BY t.kid
  )
  SELECT
    kw.id,
    kw.keyword,
    COALESCE(NULLIF(kw.platform, ''), 'toate') AS platform,
    COALESCE(c.collection, 'nealocat') AS collection,
    kw.is_active,
    COALESCE(a.found_period, 0),
    COALESCE(a.with_phone, 0),
    a.avg_price,
    a.last_found_at,
    COALESCE(kw.success_count, 0),
    COALESCE(kw.fail_count, 0),
    COALESCE(kw.consecutive_zero, 0),
    COALESCE(kw.unique_leads_count, 0),
    kw.last_success_at,
    t.zone AS top_zone,
    z.cur_avg AS zone_avg_price,
    z.prev_avg AS zone_avg_price_prev,
    CASE WHEN COALESCE(z.prev_avg, 0) > 0 AND z.cur_avg IS NOT NULL
      THEN round(((z.cur_avg - z.prev_avg) / z.prev_avg) * 100, 1)
      ELSE NULL END AS zone_variation_pct,
    z.avg_sqm AS zone_avg_sqm,
    COALESCE(s.site_count, 0) AS site_zone_count,
    s.site_avg AS site_zone_avg_price
  FROM kw
  LEFT JOIN coll c ON c.kwl = lower(kw.keyword)
  LEFT JOIN agg a ON a.kid = kw.id
  LEFT JOIN topzone t ON t.kid = kw.id
  LEFT JOIN zonestats z ON z.kid = kw.id
  LEFT JOIN sitestats s ON s.kid = kw.id
  WHERE public.has_role(auth.uid(), 'admin')
  ORDER BY COALESCE(a.found_period, 0) DESC, kw.keyword;
$$;

GRANT EXECUTE ON FUNCTION public.get_keyword_scan_report_v3(integer, text) TO authenticated;