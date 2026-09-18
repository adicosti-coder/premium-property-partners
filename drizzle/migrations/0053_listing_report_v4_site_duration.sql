-- Raport pe anunț v4: adaugă durata de publicare pe realtrust.ro și momentul în
-- care anunțul a fost scos de pe site (dezactivat), ca să se poată compara cu
-- prețurile din Cozi Aprobare.
CREATE OR REPLACE FUNCTION public.get_listing_price_report_v4(p_days integer DEFAULT 30, p_platform text DEFAULT NULL)
RETURNS TABLE(
  listing_id uuid, title text, zone text, property_type text, rooms integer, surface integer,
  source_platform text, source_url text, first_seen_at timestamp with time zone,
  last_seen_at timestamp with time zone, first_price numeric, current_price numeric,
  price_changes bigint, price_sqm numeric, contact_phone text,
  site_published_at timestamp with time zone, site_price numeric, site_slug text,
  site_first_price numeric, site_price_changes bigint,
  site_price_updated_at timestamp with time zone,
  site_is_active boolean, site_delisted_at timestamp with time zone,
  site_days_online numeric,
  consent_status text, consent_requested_at timestamp with time zone,
  consent_granted_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH guard AS (
    SELECT public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') AS ok
  ), base AS (
    SELECT r.* FROM guard g JOIN public.get_listing_price_report_v3(p_days, p_platform) r ON g.ok
  ), site AS (
    SELECT pr.slug, pr.is_active,
           CASE WHEN pr.is_active THEN NULL ELSE coalesce(pr.updated_at, pr.created_at) END AS delisted_at,
           coalesce(pr.created_at, pr.updated_at) AS published_at
    FROM public.properties pr
    WHERE pr.slug IS NOT NULL
  ), consent AS (
    SELECT c.prospect_listing_id,
           (array_agg(c.status::text ORDER BY c.requested_at DESC))[1] AS status,
           max(c.requested_at) AS requested_at,
           max(c.consented_at) AS granted_at
    FROM public.wa_publish_consents c
    WHERE c.prospect_listing_id IS NOT NULL
    GROUP BY 1
  )
  SELECT b.*,
         s.is_active,
         s.delisted_at,
         CASE
           WHEN b.site_published_at IS NULL THEN NULL
           ELSE round(
             extract(epoch FROM (coalesce(s.delisted_at, now()) - b.site_published_at)) / 86400.0,
             1
           )
         END AS site_days_online,
         co.status,
         co.requested_at,
         co.granted_at
  FROM base b
  LEFT JOIN site s ON s.slug = b.site_slug
  LEFT JOIN consent co ON co.prospect_listing_id = b.listing_id;
$function$;

REVOKE ALL ON FUNCTION public.get_listing_price_report_v4(integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_listing_price_report_v4(integer, text) TO authenticated, service_role;