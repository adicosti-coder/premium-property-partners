-- Raport pe zonă v4: prețurile anunțurilor publicate pe realtrust.ro, pe aceeași
-- zonă ȘI același tip de imobil, cu variație lunară din istoricul de preț.
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
  ), site AS (
    SELECT lower(coalesce(pr.location, ''))::text AS zone_key,
           CASE WHEN coalesce(pr.rooms, 2) <= 1 THEN 'garsoniera' ELSE 'apartament' END AS type_key,
           count(*)::bigint AS published,
           round(avg(pr.capital_necesar) FILTER (WHERE pr.capital_necesar > 0))::numeric AS avg_price,
           round(avg(pr.capital_necesar / nullif(pr.size, 0))
                 FILTER (WHERE pr.capital_necesar > 0 AND pr.size > 0))::numeric AS avg_price_sqm,
           max(coalesce(pr.updated_at, pr.created_at)) AS last_published_at
    FROM public.properties pr
    WHERE pr.is_active = true
    GROUP BY 1, 2
  ), site_hist AS (
    SELECT lower(coalesce(h.zone, ''))::text AS zone_key,
           coalesce(nullif(trim(h.property_type), ''), 'apartament') AS type_key,
           round(avg(h.price) FILTER (WHERE h.recorded_at >= date_trunc('month', now())))::numeric AS avg_price_this_month,
           round(avg(h.price) FILTER (WHERE h.recorded_at >= date_trunc('month', now()) - interval '1 month'
                                        AND h.recorded_at < date_trunc('month', now())))::numeric AS avg_price_prev_month,
           round(avg(h.price / nullif(h.surface, 0)) FILTER (WHERE h.recorded_at >= date_trunc('month', now())
                                        AND h.surface > 10))::numeric AS avg_sqm_this_month,
           round(avg(h.price / nullif(h.surface, 0)) FILTER (WHERE h.recorded_at >= date_trunc('month', now()) - interval '1 month'
                                        AND h.recorded_at < date_trunc('month', now()) AND h.surface > 10))::numeric AS avg_sqm_prev_month
    FROM public.prospect_price_history h
    WHERE h.source_platform = 'realtrust.ro' AND h.price > 0
    GROUP BY 1, 2
  )
  SELECT r.*,
         coalesce(s.published, 0)::bigint, s.avg_price, s.avg_price_sqm,
         sh.avg_price_this_month, sh.avg_price_prev_month,
         sh.avg_sqm_this_month, sh.avg_sqm_prev_month,
         s.last_published_at
  FROM guard g
  JOIN public.get_zone_price_report_v2(p_days, p_type) r ON g.ok
  LEFT JOIN site s ON s.zone_key = lower(r.zone) AND s.type_key = lower(r.property_type)
  LEFT JOIN site_hist sh ON sh.zone_key = lower(r.zone) AND sh.type_key = lower(r.property_type);
$function$;

REVOKE ALL ON FUNCTION public.get_zone_price_report_v4(integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_zone_price_report_v4(integer, text) TO authenticated, service_role;

-- Raport pe anunț v3: prețul actual de pe realtrust.ro, prima valoare înregistrată,
-- numărul de schimbări de preț și data ultimei actualizări din istoric.
CREATE OR REPLACE FUNCTION public.get_listing_price_report_v3(p_days integer DEFAULT 30, p_platform text DEFAULT NULL)
RETURNS TABLE(
  listing_id uuid, title text, zone text, property_type text, rooms integer, surface integer,
  source_platform text, source_url text, first_seen_at timestamp with time zone,
  last_seen_at timestamp with time zone, first_price numeric, current_price numeric,
  price_changes bigint, price_sqm numeric, contact_phone text,
  site_published_at timestamp with time zone, site_price numeric, site_slug text,
  site_first_price numeric, site_price_changes bigint,
  site_price_updated_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH guard AS (
    SELECT public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') AS ok
  ), site_hist AS (
    SELECT h.source_url,
           (array_agg(h.price ORDER BY h.recorded_at ASC))[1] AS first_price,
           count(DISTINCT h.price)::bigint AS price_changes,
           max(h.recorded_at) AS updated_at
    FROM public.prospect_price_history h
    WHERE h.source_platform = 'realtrust.ro' AND h.price > 0 AND h.source_url IS NOT NULL
    GROUP BY 1
  )
  SELECT r.*, sh.first_price, coalesce(sh.price_changes, 0)::bigint, sh.updated_at
  FROM guard g
  JOIN public.get_listing_price_report_v2(p_days, p_platform) r ON g.ok
  LEFT JOIN site_hist sh
    ON r.site_slug IS NOT NULL
   AND sh.source_url = 'https://realtrust.ro/proprietate/' || r.site_slug;
$function$;

REVOKE ALL ON FUNCTION public.get_listing_price_report_v3(integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_listing_price_report_v3(integer, text) TO authenticated, service_role;