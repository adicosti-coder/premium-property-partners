-- Anunțurile proprii (interne, doar admin)
CREATE TABLE IF NOT EXISTS public.my_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  zone text,
  property_type text,
  rooms integer,
  size numeric,
  price numeric,
  currency text DEFAULT 'EUR',
  description text,
  contact_phone text,
  listing_url text,
  platforms text[] DEFAULT '{}'::text[],
  publish_status jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.my_listings TO authenticated;
GRANT ALL ON public.my_listings TO service_role;

ALTER TABLE public.my_listings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage my_listings" ON public.my_listings;
CREATE POLICY "Admins manage my_listings"
ON public.my_listings FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_my_listings_zone ON public.my_listings (zone);

DROP TRIGGER IF EXISTS trg_my_listings_updated_at ON public.my_listings;
CREATE TRIGGER trg_my_listings_updated_at
BEFORE UPDATE ON public.my_listings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Raport pe zonă: preț mediu, preț/mp, luna curentă vs luna precedentă
CREATE OR REPLACE FUNCTION public.get_zone_price_report(p_days integer DEFAULT 30, p_type text DEFAULT NULL)
RETURNS TABLE (
  zone text,
  property_type text,
  samples bigint,
  avg_price numeric,
  avg_price_sqm numeric,
  avg_price_this_month numeric,
  avg_price_prev_month numeric,
  platforms bigint,
  last_seen_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH base AS (
    SELECT h.zone, h.property_type, h.price, h.surface, h.source_platform, h.recorded_at
    FROM public.prospect_price_history h
    WHERE h.price IS NOT NULL
      AND h.zone IS NOT NULL
      AND (p_type IS NULL OR h.property_type = p_type)
      AND h.recorded_at >= LEAST(
            now() - make_interval(days => GREATEST(p_days, 1)),
            date_trunc('month', now()) - interval '1 month'
          )
  )
  SELECT
    b.zone,
    COALESCE(b.property_type, 'nespecificat') AS property_type,
    COUNT(*) FILTER (WHERE b.recorded_at >= now() - make_interval(days => GREATEST(p_days, 1))) AS samples,
    ROUND(AVG(b.price) FILTER (WHERE b.recorded_at >= now() - make_interval(days => GREATEST(p_days, 1))))::numeric AS avg_price,
    ROUND(AVG(b.price / NULLIF(b.surface, 0)) FILTER (WHERE b.recorded_at >= now() - make_interval(days => GREATEST(p_days, 1))))::numeric AS avg_price_sqm,
    ROUND(AVG(b.price) FILTER (WHERE b.recorded_at >= date_trunc('month', now())))::numeric AS avg_price_this_month,
    ROUND(AVG(b.price) FILTER (
      WHERE b.recorded_at >= date_trunc('month', now()) - interval '1 month'
        AND b.recorded_at < date_trunc('month', now())
    ))::numeric AS avg_price_prev_month,
    COUNT(DISTINCT b.source_platform) AS platforms,
    MAX(b.recorded_at) AS last_seen_at
  FROM base b
  GROUP BY b.zone, COALESCE(b.property_type, 'nespecificat')
  HAVING COUNT(*) FILTER (WHERE b.recorded_at >= now() - make_interval(days => GREATEST(p_days, 1))) > 0
  ORDER BY samples DESC, b.zone;
$$;

REVOKE ALL ON FUNCTION public.get_zone_price_report(integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_zone_price_report(integer, text) TO authenticated, service_role;