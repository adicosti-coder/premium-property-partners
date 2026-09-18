-- Exclude valorile implauzibile (sub 3.000 € sau peste 3.000.000 €) din media
-- prețurilor de pe realtrust.ro, la fel ca în istoricul de preț.
CREATE OR REPLACE FUNCTION public.get_zone_price_report_v4(p_days integer DEFAULT 30, p_type text DEFAULT NULL)
RETURNS TABLE(
  zone text, property_type text, samples bigint, avg_price numeric, avg_price_sqm numeric,
  avg_price_this_month numeric, avg_price_prev_month numeric,
  avg_sqm_this_month numeric, avg_sqm_prev_month numeric,
  min_price_sqm numeric, max_price_sqm numeric, platforms bigint,
  last_seen_at timestamp with time zone,
  site_published bigint, site_avg_price numeric, site_avg_price_sqm numeric,
  site_avg_price_this_month numeric, site_avg_price_prev_month numeric,
  site_avg_sqm_this_month numeric, site_avg_sqm_prev_month numeric,
  site_last_published_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH guard AS (
    SELECT public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') AS ok
  ), market AS (
    SELECT * FROM public.get_zone_price_report_v2(p_days, p_type)
  ), site_props AS (
    SELECT public.zone_norm(pr.location) AS loc_key,
           CASE WHEN coalesce(pr.rooms, 2) <= 1 THEN 'garsoniera' ELSE 'apartament' END AS type_key,
           pr.capital_necesar AS price,
           pr.size AS surface,
           coalesce(pr.updated_at, pr.created_at) AS published_at
    FROM public.properties pr
    WHERE pr.is_active = true AND pr.capital_necesar BETWEEN 3000 AND 3000000
  ), site AS (
    SELECT m.zone, m.property_type,
           count(*)::bigint AS published,
           round(avg(sp.price))::numeric AS avg_price,
           round(avg(sp.price / nullif(sp.surface, 0)) FILTER (WHERE sp.surface > 10))::numeric AS avg_price_sqm,
           max(sp.published_at) AS last_published_at
    FROM market m
    JOIN site_props sp
      ON sp.type_key = public.zone_norm(m.property_type)
     AND length(public.zone_norm(m.zone)) > 3
     AND sp.loc_key LIKE '%' || public.zone_norm(m.zone) || '%'
    GROUP BY 1, 2
  ), site_hist AS (
    SELECT m.zone, m.property_type,
           round(avg(h.price) FILTER (WHERE h.recorded_at >= date_trunc('month', now())))::numeric AS avg_price_this_month,
           round(avg(h.price) FILTER (WHERE h.recorded_at >= date_trunc('month', now()) - interval '1 month'
                                        AND h.recorded_at < date_trunc('month', now())))::numeric AS avg_price_prev_month,
           round(avg(h.price / nullif(h.surface, 0)) FILTER (WHERE h.recorded_at >= date_trunc('month', now())
                                        AND h.surface > 10))::numeric AS avg_sqm_this_month,
           round(avg(h.price / nullif(h.surface, 0)) FILTER (WHERE h.recorded_at >= date_trunc('month', now()) - interval '1 month'
                                        AND h.recorded_at < date_trunc('month', now()) AND h.surface > 10))::numeric AS avg_sqm_prev_month
    FROM market m
    JOIN public.prospect_price_history h
      ON h.source_platform = 'realtrust.ro'
     AND h.price BETWEEN 3000 AND 3000000
     AND public.zone_norm(coalesce(h.property_type, 'apartament')) = public.zone_norm(m.property_type)
     AND length(public.zone_norm(m.zone)) > 3
     AND public.zone_norm(h.zone) LIKE '%' || public.zone_norm(m.zone) || '%'
    GROUP BY 1, 2
  )
  SELECT m.*,
         coalesce(s.published, 0)::bigint, s.avg_price, s.avg_price_sqm,
         sh.avg_price_this_month, sh.avg_price_prev_month,
         sh.avg_sqm_this_month, sh.avg_sqm_prev_month,
         s.last_published_at
  FROM guard g
  JOIN market m ON g.ok
  LEFT JOIN site s ON s.zone = m.zone AND s.property_type = m.property_type
  LEFT JOIN site_hist sh ON sh.zone = m.zone AND sh.property_type = m.property_type;
$function$;

REVOKE ALL ON FUNCTION public.get_zone_price_report_v4(integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_zone_price_report_v4(integer, text) TO authenticated, service_role;