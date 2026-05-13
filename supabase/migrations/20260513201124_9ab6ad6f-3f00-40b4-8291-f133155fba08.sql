DROP FUNCTION IF EXISTS public.get_prospect_injection_rejection_details(text, integer, integer);

CREATE OR REPLACE FUNCTION public.get_prospect_injection_rejection_details(
  p_reason text,
  p_days integer,
  p_limit integer,
  p_platform text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  source_platform text,
  source_url text,
  title text,
  zone text,
  rooms integer,
  size integer,
  price integer,
  contact_phone text,
  phone_normalized text,
  dedup_key text,
  scraped_at timestamp with time zone,
  rejection_reason text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
    AND (p_platform IS NULL OR pl.source_platform ILIKE p_platform)
    AND public.has_role(auth.uid(), 'admin')
  ORDER BY COALESCE(pl.scraped_at, pl.created_at) DESC
  LIMIT GREATEST(1, LEAST(p_limit, 200));
$$;

COMMENT ON FUNCTION public.get_prospect_injection_rejection_details IS 'Returns rejected prospect listings with optional source_platform filter for admin drill-down.';