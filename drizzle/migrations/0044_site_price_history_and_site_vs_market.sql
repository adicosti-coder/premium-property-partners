-- 1) Istoric de preț pentru anunțurile publicate pe realtrust.ro, ca variația
-- lunară și €/mp din raportul pe zonă să reflecte și site-ul.
CREATE OR REPLACE FUNCTION public.record_site_property_price()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_price numeric := NEW.capital_necesar;
  v_type text;
BEGIN
  IF NEW.is_active IS NOT TRUE THEN RETURN NEW; END IF;
  IF v_price IS NULL OR v_price < 3000 OR v_price > 3000000 THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND COALESCE(OLD.capital_necesar, -1) = COALESCE(NEW.capital_necesar, -1)
     AND COALESCE(OLD.is_active, false) = true THEN
    RETURN NEW;
  END IF;

  v_type := CASE WHEN COALESCE(NEW.rooms, 2) <= 1 THEN 'garsoniera' ELSE 'apartament' END;

  INSERT INTO public.prospect_price_history
    (listing_id, source_platform, source_url, zone, rooms, surface, price, recorded_at, property_type)
  VALUES
    (NULL, 'realtrust.ro',
     CASE WHEN NEW.slug IS NOT NULL THEN 'https://realtrust.ro/proprietate/' || NEW.slug ELSE NULL END,
     NEW.location, NEW.rooms, NEW.size, v_price, now(), v_type);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_record_site_property_price ON public.properties;
CREATE TRIGGER trg_record_site_property_price
AFTER INSERT OR UPDATE OF capital_necesar, is_active ON public.properties
FOR EACH ROW EXECUTE FUNCTION public.record_site_property_price();

-- Backfill: prima înregistrare pentru anunțurile deja publicate pe site.
INSERT INTO public.prospect_price_history
  (listing_id, source_platform, source_url, zone, rooms, surface, price, recorded_at, property_type)
SELECT NULL, 'realtrust.ro',
       CASE WHEN p.slug IS NOT NULL THEN 'https://realtrust.ro/proprietate/' || p.slug END,
       p.location, p.rooms, p.size, p.capital_necesar, COALESCE(p.updated_at, p.created_at, now()),
       CASE WHEN COALESCE(p.rooms, 2) <= 1 THEN 'garsoniera' ELSE 'apartament' END
FROM public.properties p
WHERE p.is_active = true
  AND p.capital_necesar IS NOT NULL
  AND p.capital_necesar BETWEEN 3000 AND 3000000
  AND NOT EXISTS (
    SELECT 1 FROM public.prospect_price_history h
    WHERE h.source_platform = 'realtrust.ro'
      AND h.source_url = 'https://realtrust.ro/proprietate/' || p.slug
  );

-- 2) Raport comparativ: realtrust.ro vs anunțurile găsite, pe zonă și tip.
CREATE OR REPLACE FUNCTION public.get_site_vs_market_report(p_days integer DEFAULT 90, p_type text DEFAULT NULL)
RETURNS TABLE (
  zone text,
  property_type text,
  site_count bigint,
  site_avg_price numeric,
  site_avg_sqm numeric,
  market_count bigint,
  market_avg_price numeric,
  market_avg_sqm numeric,
  price_diff_pct numeric,
  sqm_diff_pct numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH base AS (
    SELECT
      COALESCE(NULLIF(TRIM(h.zone), ''), 'Nespecificat') AS zone,
      COALESCE(NULLIF(TRIM(h.property_type), ''), 'apartament') AS property_type,
      (h.source_platform = 'realtrust.ro') AS is_site,
      h.price,
      CASE WHEN h.surface > 10 THEN h.price / h.surface END AS price_sqm
    FROM public.prospect_price_history h
    WHERE h.recorded_at >= now() - (GREATEST(COALESCE(p_days, 90), 1) || ' days')::interval
      AND h.price IS NOT NULL
      AND h.price BETWEEN 3000 AND 3000000
      AND public.has_role(auth.uid(), 'admin')
      AND (p_type IS NULL OR COALESCE(NULLIF(TRIM(h.property_type), ''), 'apartament') = p_type)
  ), agg AS (
    SELECT
      zone, property_type,
      COUNT(*) FILTER (WHERE is_site) AS site_count,
      ROUND(AVG(price) FILTER (WHERE is_site)) AS site_avg_price,
      ROUND(AVG(price_sqm) FILTER (WHERE is_site)) AS site_avg_sqm,
      COUNT(*) FILTER (WHERE NOT is_site) AS market_count,
      ROUND(AVG(price) FILTER (WHERE NOT is_site)) AS market_avg_price,
      ROUND(AVG(price_sqm) FILTER (WHERE NOT is_site)) AS market_avg_sqm
    FROM base
    GROUP BY zone, property_type
  )
  SELECT
    zone, property_type, site_count, site_avg_price, site_avg_sqm,
    market_count, market_avg_price, market_avg_sqm,
    CASE WHEN market_avg_price > 0 AND site_avg_price IS NOT NULL
      THEN ROUND(((site_avg_price - market_avg_price) / market_avg_price) * 100, 1) END,
    CASE WHEN market_avg_sqm > 0 AND site_avg_sqm IS NOT NULL
      THEN ROUND(((site_avg_sqm - market_avg_sqm) / market_avg_sqm) * 100, 1) END
  FROM agg
  ORDER BY (site_count + market_count) DESC, zone;
$$;

REVOKE ALL ON FUNCTION public.get_site_vs_market_report(integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_site_vs_market_report(integer, text) TO authenticated, service_role;