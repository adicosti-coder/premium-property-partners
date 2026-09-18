-- 1) Realtime pe acorduri, ca Cozi Aprobare să se actualizeze imediat la răspunsul proprietarului.
ALTER TABLE public.wa_publish_consents REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'wa_publish_consents'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.wa_publish_consents';
  END IF;
END $$;

-- 2) Prețul mediu al anunțurilor din Cozi Aprobare, pe zonă și tip de imobil.
CREATE OR REPLACE FUNCTION public.get_zone_consent_price_report(
  p_days integer DEFAULT 30,
  p_type text DEFAULT NULL
)
RETURNS TABLE (
  zone text,
  property_type text,
  consent_listings bigint,
  consent_avg_price numeric,
  granted_listings bigint,
  granted_avg_price numeric,
  published_listings bigint,
  published_avg_price numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH base AS (
    SELECT
      COALESCE(NULLIF(TRIM(pl.zone), ''), 'Nespecificat') AS zone,
      COALESCE((
        SELECT ph.property_type FROM public.prospect_price_history ph
        WHERE ph.listing_id = pl.id AND ph.property_type IS NOT NULL
        ORDER BY ph.recorded_at DESC LIMIT 1
      ), 'apartament') AS property_type,
      c.status,
      pl.price
    FROM public.wa_publish_consents c
    JOIN public.prospect_listings pl ON pl.id = c.prospect_listing_id
    WHERE c.created_at >= now() - make_interval(days => GREATEST(COALESCE(p_days, 30), 1))
      AND pl.price IS NOT NULL
      AND pl.price BETWEEN 3000 AND 3000000
      AND public.has_role(auth.uid(), 'admin')
  )
  SELECT
    b.zone,
    b.property_type,
    COUNT(*)::bigint,
    ROUND(AVG(b.price)::numeric, 0),
    COUNT(*) FILTER (WHERE b.status IN ('granted', 'published'))::bigint,
    ROUND(AVG(b.price) FILTER (WHERE b.status IN ('granted', 'published'))::numeric, 0),
    COUNT(*) FILTER (WHERE b.status = 'published')::bigint,
    ROUND(AVG(b.price) FILTER (WHERE b.status = 'published')::numeric, 0)
  FROM base b
  WHERE p_type IS NULL OR b.property_type = p_type
  GROUP BY b.zone, b.property_type
  ORDER BY b.zone, b.property_type;
$$;

GRANT EXECUTE ON FUNCTION public.get_zone_consent_price_report(integer, text) TO authenticated;
