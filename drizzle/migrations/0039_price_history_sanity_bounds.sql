-- Prețuri absurde (extrase greșit din text) nu trebuie să intre în istoric.
CREATE OR REPLACE FUNCTION public.record_prospect_price_history()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  blob text;
  ptype text;
BEGIN
  -- Interval realist: chirie de la 150 € până la 3.000.000 € preț de vânzare.
  IF NEW.price IS NULL OR NEW.price < 150 OR NEW.price > 3000000 THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' OR COALESCE(OLD.price, -1) IS DISTINCT FROM COALESCE(NEW.price, -1) THEN
    blob := lower(coalesce(NEW.title, '') || ' ' || coalesce(NEW.description, ''));
    ptype := CASE
      WHEN blob ~ 'garsonier' THEN 'garsoniera'
      WHEN blob ~ '(teren|parcel|lot de)' THEN 'teren'
      WHEN blob ~ '(casa|casă|vila|vilă|duplex)' THEN 'casa'
      WHEN blob ~ '(spatiu comercial|spațiu comercial|birou)' THEN 'comercial'
      WHEN blob ~ 'apartament' THEN 'apartament'
      WHEN NEW.rooms = 1 THEN 'garsoniera'
      WHEN NEW.rooms > 1 THEN 'apartament'
      ELSE NULL
    END;

    INSERT INTO public.prospect_price_history (listing_id, source_platform, source_url, zone, rooms, surface, price, property_type)
    VALUES (NEW.id, NEW.source_platform, NEW.source_url, NEW.zone, NEW.rooms, NEW.size, NEW.price, ptype);
  END IF;
  RETURN NEW;
END;
$function$;

-- Raportul pe zonă ignoră valorile din afara intervalului realist.
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
      AND h.price BETWEEN 150 AND 3000000
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