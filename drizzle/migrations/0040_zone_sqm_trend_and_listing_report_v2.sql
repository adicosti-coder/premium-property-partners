-- Versiune nouă a raportului pe zonă, cu evoluția prețului pe metru pătrat
-- (lună curentă vs precedentă) și intervalul min/max pe fiecare tip de imobil.
CREATE OR REPLACE FUNCTION public.get_zone_price_report_v2(p_days integer DEFAULT 30, p_type text DEFAULT NULL)
RETURNS TABLE (
  zone text,
  property_type text,
  samples bigint,
  avg_price numeric,
  avg_price_sqm numeric,
  avg_price_this_month numeric,
  avg_price_prev_month numeric,
  avg_sqm_this_month numeric,
  avg_sqm_prev_month numeric,
  min_price_sqm numeric,
  max_price_sqm numeric,
  platforms bigint,
  last_seen_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH base AS (
    SELECT h.zone, h.property_type, h.price, h.surface, h.source_platform, h.recorded_at,
           CASE WHEN h.surface > 5 THEN h.price / h.surface END AS price_sqm
    FROM public.prospect_price_history h
    WHERE h.price IS NOT NULL
      AND h.price BETWEEN 150 AND 3000000
      AND h.zone IS NOT NULL
      AND (p_type IS NULL OR h.property_type = p_type)
      AND h.recorded_at >= LEAST(
            now() - make_interval(days => GREATEST(p_days, 1)),
            date_trunc('month', now()) - interval '1 month'
          )
  ), win AS (
    SELECT base.*, base.recorded_at >= now() - make_interval(days => GREATEST(p_days, 1)) AS in_window
    FROM base
  )
  SELECT
    b.zone,
    COALESCE(b.property_type, 'nespecificat') AS property_type,
    COUNT(*) FILTER (WHERE b.in_window) AS samples,
    ROUND(AVG(b.price) FILTER (WHERE b.in_window))::numeric AS avg_price,
    ROUND(AVG(b.price_sqm) FILTER (WHERE b.in_window))::numeric AS avg_price_sqm,
    ROUND(AVG(b.price) FILTER (WHERE b.recorded_at >= date_trunc('month', now())))::numeric AS avg_price_this_month,
    ROUND(AVG(b.price) FILTER (
      WHERE b.recorded_at >= date_trunc('month', now()) - interval '1 month'
        AND b.recorded_at < date_trunc('month', now())
    ))::numeric AS avg_price_prev_month,
    ROUND(AVG(b.price_sqm) FILTER (WHERE b.recorded_at >= date_trunc('month', now())))::numeric AS avg_sqm_this_month,
    ROUND(AVG(b.price_sqm) FILTER (
      WHERE b.recorded_at >= date_trunc('month', now()) - interval '1 month'
        AND b.recorded_at < date_trunc('month', now())
    ))::numeric AS avg_sqm_prev_month,
    ROUND(MIN(b.price_sqm) FILTER (WHERE b.in_window))::numeric AS min_price_sqm,
    ROUND(MAX(b.price_sqm) FILTER (WHERE b.in_window))::numeric AS max_price_sqm,
    COUNT(DISTINCT b.source_platform) FILTER (WHERE b.in_window) AS platforms,
    MAX(b.recorded_at) FILTER (WHERE b.in_window) AS last_seen_at
  FROM win b
  GROUP BY b.zone, COALESCE(b.property_type, 'nespecificat')
  HAVING COUNT(*) FILTER (WHERE b.in_window) > 0
  ORDER BY samples DESC, b.zone;
$$;

REVOKE ALL ON FUNCTION public.get_zone_price_report_v2(integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_zone_price_report_v2(integer, text) TO authenticated, service_role;

-- Raport pe anunț: data publicării, platforma, prețul inițial și actual,
-- câte modificări de preț a avut și linkul original.
CREATE OR REPLACE FUNCTION public.get_listing_price_report(p_days integer DEFAULT 30, p_platform text DEFAULT NULL)
RETURNS TABLE (
  listing_id uuid,
  title text,
  zone text,
  property_type text,
  rooms integer,
  surface integer,
  source_platform text,
  source_url text,
  first_seen_at timestamptz,
  last_seen_at timestamptz,
  first_price numeric,
  current_price numeric,
  price_changes bigint,
  price_sqm numeric,
  contact_phone text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH h AS (
    SELECT ph.listing_id,
           MIN(ph.recorded_at) AS first_seen_at,
           MAX(ph.recorded_at) AS last_seen_at,
           GREATEST(COUNT(*) - 1, 0) AS price_changes,
           MIN(ph.property_type) AS property_type,
           (ARRAY_AGG(ph.price ORDER BY ph.recorded_at ASC))[1] AS first_price,
           (ARRAY_AGG(ph.price ORDER BY ph.recorded_at DESC))[1] AS current_price
    FROM public.prospect_price_history ph
    WHERE ph.price BETWEEN 150 AND 3000000
    GROUP BY ph.listing_id
  )
  SELECT
    p.id,
    p.title,
    p.zone,
    COALESCE(h.property_type, 'nespecificat'),
    p.rooms,
    p.size,
    p.source_platform,
    p.source_url,
    COALESCE(h.first_seen_at, p.scraped_at, p.created_at),
    COALESCE(h.last_seen_at, p.scraped_at, p.created_at),
    h.first_price,
    COALESCE(h.current_price, p.price),
    COALESCE(h.price_changes, 0),
    ROUND(COALESCE(h.current_price, p.price) / NULLIF(p.size, 0))::numeric,
    p.contact_phone
  FROM public.prospect_listings p
  LEFT JOIN h ON h.listing_id = p.id
  WHERE COALESCE(p.scraped_at, p.created_at) >= now() - make_interval(days => GREATEST(p_days, 1))
    AND (p_platform IS NULL OR p.source_platform = p_platform)
  ORDER BY COALESCE(h.last_seen_at, p.scraped_at, p.created_at) DESC
  LIMIT 500;
$$;

REVOKE ALL ON FUNCTION public.get_listing_price_report(integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_listing_price_report(integer, text) TO authenticated, service_role;