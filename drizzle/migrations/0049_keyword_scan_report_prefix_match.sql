-- Scanerul salvează cuvântul cheie cu sufixul „site:domeniu", deci potrivim pe prefix
CREATE OR REPLACE FUNCTION public.get_keyword_scan_report(
  p_days integer DEFAULT 30,
  p_platform text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  keyword text,
  platform text,
  is_active boolean,
  found_period bigint,
  with_phone bigint,
  avg_price numeric,
  last_found_at timestamptz,
  success_count integer,
  fail_count integer,
  consecutive_zero integer,
  unique_leads_count integer,
  last_success_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    k.id,
    k.keyword,
    COALESCE(NULLIF(k.platform, ''), 'toate') AS platform,
    k.is_active,
    COALESCE(m.found_period, 0) AS found_period,
    COALESCE(m.with_phone, 0) AS with_phone,
    m.avg_price,
    m.last_found_at,
    COALESCE(k.success_count, 0),
    COALESCE(k.fail_count, 0),
    COALESCE(k.consecutive_zero, 0),
    COALESCE(k.unique_leads_count, 0),
    k.last_success_at
  FROM public.scraper_search_keywords k
  LEFT JOIN LATERAL (
    SELECT
      count(*) AS found_period,
      count(*) FILTER (WHERE COALESCE(p.phone_normalized, p.contact_phone) IS NOT NULL) AS with_phone,
      round(avg(NULLIF(p.price, 0))) AS avg_price,
      max(p.created_at) AS last_found_at
    FROM public.prospect_listings p
    WHERE p.created_at >= now() - make_interval(days => GREATEST(p_days, 1))
      AND p.search_keywords IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM unnest(p.search_keywords) AS sk
        WHERE lower(sk) = lower(k.keyword)
           OR lower(sk) LIKE lower(k.keyword) || ' site:%'
      )
      AND (p_platform IS NULL OR p.source_platform = p_platform)
  ) m ON TRUE
  WHERE public.has_role(auth.uid(), 'admin')
    AND (p_platform IS NULL OR COALESCE(NULLIF(k.platform, ''), 'toate') IN (p_platform, 'toate'))
  ORDER BY COALESCE(m.found_period, 0) DESC, k.keyword;
$$;