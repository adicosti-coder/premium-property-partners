-- Prețurile anunțurilor publicate pe realtrust.ro, adăugate în rapoartele pe platformă,
-- pe zonă și pe anunț, ca să se poată compara cu anunțurile noi găsite.

CREATE OR REPLACE FUNCTION public.get_platform_scan_report_v3(p_days integer DEFAULT 30)
RETURNS TABLE(
  source_platform text, found_period bigint, with_phone bigint, duplicates bigint,
  agencies bigint, invalid_data bigint, avg_price numeric, avg_price_this_month numeric,
  avg_price_prev_month numeric, avg_price_sqm numeric, avg_sqm_this_month numeric,
  avg_sqm_prev_month numeric, last_found_at timestamp with time zone,
  site_published bigint, site_avg_price numeric, site_avg_price_sqm numeric,
  site_last_published_at timestamp with time zone
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH guard AS (
    SELECT public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') AS ok
  ), site AS (
    SELECT coalesce(pl.source_platform, 'Necunoscut')::text AS platform,
           count(*)::bigint AS published,
           round(avg(pr.capital_necesar) FILTER (WHERE pr.capital_necesar > 0))::numeric AS avg_price,
           round(avg(pr.capital_necesar / nullif(pr.size, 0))
                 FILTER (WHERE pr.capital_necesar > 0 AND pr.size > 0))::numeric AS avg_price_sqm,
           max(pr.created_at) AS last_published_at
    FROM public.properties pr
    JOIN public.prospect_listings pl ON pl.id = pr.migrated_from_prospect_id
    WHERE pr.is_active = true
      AND pr.created_at >= now() - make_interval(days => GREATEST(p_days, 1))
    GROUP BY 1
  )
  SELECT r.*, coalesce(s.published, 0)::bigint, s.avg_price, s.avg_price_sqm, s.last_published_at
  FROM guard g
  JOIN public.get_platform_scan_report_v2(p_days) r ON g.ok
  LEFT JOIN site s ON s.platform = r.source_platform;
$function$;

CREATE OR REPLACE FUNCTION public.get_zone_price_report_v3(p_days integer DEFAULT 30, p_type text DEFAULT NULL::text)
RETURNS TABLE(
  zone text, property_type text, samples bigint, avg_price numeric, avg_price_sqm numeric,
  avg_price_this_month numeric, avg_price_prev_month numeric, avg_sqm_this_month numeric,
  avg_sqm_prev_month numeric, min_price_sqm numeric, max_price_sqm numeric, platforms bigint,
  last_seen_at timestamp with time zone,
  site_published bigint, site_avg_price numeric, site_avg_price_sqm numeric
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH guard AS (
    SELECT public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') AS ok
  ), site AS (
    SELECT lower(coalesce(pr.location, ''))::text AS zone_key,
           count(*)::bigint AS published,
           round(avg(pr.capital_necesar) FILTER (WHERE pr.capital_necesar > 0))::numeric AS avg_price,
           round(avg(pr.capital_necesar / nullif(pr.size, 0))
                 FILTER (WHERE pr.capital_necesar > 0 AND pr.size > 0))::numeric AS avg_price_sqm
    FROM public.properties pr
    WHERE pr.is_active = true
    GROUP BY 1
  )
  SELECT r.*, coalesce(s.published, 0)::bigint, s.avg_price, s.avg_price_sqm
  FROM guard g
  JOIN public.get_zone_price_report_v2(p_days, p_type) r ON g.ok
  LEFT JOIN site s ON s.zone_key = lower(r.zone);
$function$;

CREATE OR REPLACE FUNCTION public.get_listing_price_report_v2(p_days integer DEFAULT 30, p_platform text DEFAULT NULL::text)
RETURNS TABLE(
  listing_id uuid, title text, zone text, property_type text, rooms integer, surface integer,
  source_platform text, source_url text, first_seen_at timestamp with time zone,
  last_seen_at timestamp with time zone, first_price numeric, current_price numeric,
  price_changes bigint, price_sqm numeric, contact_phone text,
  site_published_at timestamp with time zone, site_price numeric, site_slug text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH guard AS (
    SELECT public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') AS ok
  ), site AS (
    SELECT pr.migrated_from_prospect_id AS listing_id,
           min(pr.created_at) AS published_at,
           max(pr.capital_necesar) AS price,
           min(pr.slug) AS slug
    FROM public.properties pr
    WHERE pr.migrated_from_prospect_id IS NOT NULL AND pr.is_active = true
    GROUP BY 1
  )
  SELECT r.*, s.published_at, s.price, s.slug
  FROM guard g
  JOIN public.get_listing_price_report(p_days, p_platform) r ON g.ok
  LEFT JOIN site s ON s.listing_id = r.listing_id;
$function$;

REVOKE ALL ON FUNCTION public.get_listing_price_report(integer, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_platform_scan_report_v3(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_zone_price_report_v3(integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_listing_price_report_v2(integer, text) TO authenticated;