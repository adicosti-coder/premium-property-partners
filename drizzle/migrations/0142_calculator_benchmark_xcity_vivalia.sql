-- Adds XCity Towers and Vivalia as separate calculator zones in the sale benchmark.
-- Public aggregate only: never returns individual listings or contacts.
CREATE OR REPLACE FUNCTION public.get_calculator_sale_benchmark(p_zone text, p_rooms integer DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pattern text;
  v_zones text[];
  v_rooms integer := CASE WHEN p_rooms BETWEEN 1 AND 3 THEN p_rooms ELSE NULL END;
  v_med numeric;
  v_n integer;
  v_idx record;
  c_min_sample constant integer := 5;
BEGIN
  IF p_zone IS NULL OR length(p_zone) > 40 THEN
    RETURN NULL;
  END IF;

  v_pattern := CASE p_zone
    WHEN 'monarch' THEN 'monarch'
    WHEN 'nordone' THEN 'nord\s*one'
    WHEN 'city-of-mara' THEN 'city of mara'
    WHEN 'paltim' THEN 'paltim'
    WHEN 'ring-residence' THEN 'ring\s*residence'
    WHEN 'denya-forest' THEN 'denya'
    WHEN 'fructus' THEN 'fructus'
    WHEN 'ateneo' THEN 'ateneo'
    WHEN 'future-residence' THEN 'future\s*residence'
    WHEN 'alenia' THEN 'alenia'
    WHEN 'xcity' THEN 'x\s*-?\s*city'
    WHEN 'vivalia' THEN 'vivalia'
    WHEN 'torontalului' THEN 'torontal'
    ELSE NULL END;
  v_zones := CASE p_zone
    WHEN 'central' THEN ARRAY['Centru','Cetate','Iosefin','Elisabetin','Fabric']
    WHEN 'torontalului' THEN ARRAY['Torontalului']
    WHEN 'complex-studentesc' THEN ARRAY['Complexul Studențesc','Complex Studențesc']
    ELSE NULL END;

  IF p_zone NOT IN ('monarch','nordone','city-of-mara','paltim','ring-residence','denya-forest','fructus','ateneo','future-residence','alenia','xcity','vivalia','central','torontalului','complex-studentesc','alta-zona') THEN
    RETURN NULL;
  END IF;

  -- Tier 1: median of collected sale listings (same rooms first, then all rooms).
  FOR i IN 1..2 LOOP
    SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY pl.price_per_sqm), count(*)
      INTO v_med, v_n
      FROM public.prospect_listings pl
     WHERE pl.category = 'vanzare'
       AND pl.price_per_sqm BETWEEN 300 AND 6000
       AND coalesce(pl.last_seen_at, pl.created_at) > now() - interval '180 days'
       AND (i = 2 OR v_rooms IS NULL OR (CASE WHEN v_rooms = 3 THEN pl.rooms >= 3 ELSE pl.rooms = v_rooms END))
       AND (
         p_zone = 'alta-zona'
         OR (v_zones IS NOT NULL AND pl.zone = ANY (v_zones))
         OR (v_pattern IS NOT NULL AND concat_ws(' ', pl.title, pl.enriched_title) ~* v_pattern)
       );
    IF v_n >= c_min_sample THEN
      RETURN jsonb_build_object('eur_sqm', round(v_med), 'sample', v_n, 'tier', 'listings', 'rooms_matched', i = 1 AND v_rooms IS NOT NULL);
    END IF;
    EXIT WHEN v_rooms IS NULL;
  END LOOP;

  -- Tier 2: reference indices (same rooms first, then all rooms).
  SELECT mi.sale_eur_sqm, mi.source, mi.period_month
    INTO v_idx
    FROM public.timisoara_market_indices mi
   WHERE mi.zone_key = p_zone
     AND mi.sale_eur_sqm IS NOT NULL
     AND mi.rooms IN (coalesce(v_rooms, 0), 0)
   ORDER BY (mi.rooms = coalesce(v_rooms, 0)) DESC, mi.period_month DESC
   LIMIT 1;
  IF FOUND THEN
    RETURN jsonb_build_object('eur_sqm', round(v_idx.sale_eur_sqm), 'tier', 'index', 'source', v_idx.source, 'period', v_idx.period_month);
  END IF;

  -- Tier 3 is the client-side reference grid.
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.get_calculator_sale_benchmark(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_calculator_sale_benchmark(text, integer) TO anon, authenticated, service_role;