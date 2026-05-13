CREATE OR REPLACE FUNCTION public.get_prospect_injection_rejection_details(
  p_reason text,
  p_days integer DEFAULT 7,
  p_limit integer DEFAULT 25
)
RETURNS TABLE(
  id uuid,
  source_platform text,
  source_url text,
  title text,
  zone text,
  rooms integer,
  size numeric,
  price numeric,
  contact_phone text,
  phone_normalized text,
  dedup_key text,
  scraped_at timestamptz,
  rejection_reason text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    pl.id,
    pl.source_platform,
    pl.source_url,
    pl.title,
    pl.zone,
    pl.rooms,
    pl.size,
    pl.price,
    pl.contact_phone,
    pl.phone_normalized,
    pl.dedup_key,
    COALESCE(pl.scraped_at, pl.created_at) AS scraped_at,
    pl.rejection_reason
  FROM public.prospect_listings pl
  WHERE pl.rejection_reason = p_reason
    AND COALESCE(pl.scraped_at, pl.created_at) > now() - (p_days || ' days')::interval
    AND public.has_role(auth.uid(), 'admin')
  ORDER BY COALESCE(pl.scraped_at, pl.created_at) DESC
  LIMIT GREATEST(1, LEAST(p_limit, 200));
$function$;

CREATE OR REPLACE FUNCTION public.get_prospect_injection_rejection_by_platform(
  p_days integer DEFAULT 7
)
RETURNS TABLE(
  rejection_reason text,
  source_platform text,
  count_period bigint
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    coalesce(pl.rejection_reason, 'unknown')::text,
    coalesce(pl.source_platform, 'unknown')::text,
    count(*)::bigint
  FROM public.prospect_listings pl
  WHERE pl.rejection_reason IS NOT NULL
    AND COALESCE(pl.scraped_at, pl.created_at) > now() - (p_days || ' days')::interval
    AND public.has_role(auth.uid(), 'admin')
  GROUP BY 1, 2
  ORDER BY 1, 3 DESC;
$function$;