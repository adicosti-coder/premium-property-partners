CREATE OR REPLACE FUNCTION public.get_zone_price_map()
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH zones(idx, keys) AS (VALUES
    (0, ARRAY['cetate','centru','unirii','victoriei']),
    (1, ARRAY['elisabetin']),
    (2, ARRAY['iosefin']),
    (3, ARRAY['fabric']),
    (4, ARRAY['complex stud','circumval','iulius','lipovei','torontal','aradului','bucovina','ronat']),
    (5, ARRAY['dumbr']),
    (6, ARRAY['giroc','martirilor','soarelui','judetean','dambovi','braytim','sagului','freidorf']),
    (7, ARRAY['mosnita','ghiroda','sacalaz','chisoda'])
  ),
  sale AS (
    SELECT translate(lower(COALESCE(zone, '')), 'ăâîșşțţ', 'aaisstt') AS z, price::numeric / size::numeric AS ppm
    FROM (SELECT zone, price, size FROM public.prospect_listings
          WHERE category = 'vanzare' AND created_at >= now() - interval '180 days'
            AND price BETWEEN 20000 AND 1500000 AND size >= 15
          ORDER BY created_at DESC LIMIT 3000) s
  ),
  rent AS (
    SELECT translate(lower(COALESCE(zone, '')), 'ăâîșşțţ', 'aaisstt') AS z, price::numeric / size::numeric AS ppm
    FROM (SELECT zone, price, size FROM public.prospect_listings
          WHERE category = 'inchiriere' AND created_at >= now() - interval '180 days'
            AND price BETWEEN 150 AND 5000 AND size >= 15
          ORDER BY created_at DESC LIMIT 2000) r
  ),
  sale_ok AS (
    SELECT s.ppm, (SELECT min(zz.idx) FROM zones zz WHERE EXISTS (SELECT 1 FROM unnest(zz.keys) k WHERE s.z LIKE '%' || k || '%')) AS idx
    FROM sale s WHERE s.ppm > 600 AND s.ppm < 6000
  ),
  rent_ok AS (
    SELECT r.ppm, (SELECT min(zz.idx) FROM zones zz WHERE EXISTS (SELECT 1 FROM unnest(zz.keys) k WHERE r.z LIKE '%' || k || '%')) AS idx
    FROM rent r WHERE r.ppm > 3 AND r.ppm < 40
  ),
  city AS (
    SELECT (SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY ppm) FROM sale_ok) AS sale_ppm,
           (SELECT count(*) FROM sale_ok) AS sale_n,
           COALESCE((SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY ppm) FROM rent_ok), 9) AS rent_ppm
  ),
  per_zone AS (
    SELECT z.idx,
      (SELECT count(*) FROM sale_ok WHERE idx = z.idx) AS n,
      (SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY ppm) FROM sale_ok WHERE idx = z.idx) AS ppm,
      (SELECT count(*) FROM rent_ok WHERE idx = z.idx) AS rent_n,
      (SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY ppm) FROM rent_ok WHERE idx = z.idx) AS rent_ppm
    FROM zones z
  )
  SELECT jsonb_build_object(
    'city_ppm', COALESCE(round((SELECT sale_ppm FROM city)::numeric), 0),
    'sample', (SELECT sale_n FROM city),
    'city_rent_ppm', round((SELECT rent_ppm FROM city)::numeric, 1),
    'zones', (SELECT jsonb_agg(jsonb_build_object(
        'idx', idx, 'n', n,
        'ppm', CASE WHEN n >= 5 THEN round(ppm::numeric) END,
        'rent_n', rent_n,
        'rent_ppm', round((CASE WHEN rent_n >= 5 THEN rent_ppm ELSE (SELECT rent_ppm FROM city) END)::numeric, 3)
      ) ORDER BY idx) FROM per_zone)
  )
$function$;

REVOKE ALL ON FUNCTION public.get_zone_price_map() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_zone_price_map() TO anon, authenticated, service_role;