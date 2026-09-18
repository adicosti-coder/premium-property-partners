CREATE OR REPLACE FUNCTION public.get_collection_listings_report(
  p_days integer DEFAULT 30,
  p_collection text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  collection text,
  keyword text,
  title text,
  price numeric,
  size numeric,
  rooms integer,
  zone text,
  source_platform text,
  source_url text,
  contact_phone text,
  created_at timestamptz,
  last_seen_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH coll AS (
    SELECT DISTINCT ON (lower(q.keyword))
      lower(q.keyword) AS kwl,
      q.keyword AS keyword,
      NULLIF(q.metadata->>'collection', '') AS collection
    FROM public.keyword_radar_queries q
    WHERE NULLIF(q.metadata->>'collection', '') IS NOT NULL
    ORDER BY lower(q.keyword), q.is_active DESC, q.updated_at DESC NULLS LAST
  ),
  hits AS (
    SELECT DISTINCT ON (p.id, c.collection)
      p.id,
      c.collection,
      c.keyword,
      COALESCE(NULLIF(p.enriched_title, ''), p.title) AS title,
      p.price,
      p.size,
      p.rooms,
      p.zone,
      p.source_platform,
      p.source_url,
      COALESCE(p.phone_normalized, p.contact_phone) AS contact_phone,
      p.created_at,
      p.last_seen_at
    FROM public.prospect_listings p
    JOIN coll c
      ON p.search_keywords IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM unnest(p.search_keywords) AS sk
       WHERE lower(sk) = c.kwl OR lower(sk) LIKE c.kwl || ' site:%'
     )
    WHERE p.created_at >= now() - make_interval(days => GREATEST(p_days, 1))
      AND (p_collection IS NULL OR c.collection = p_collection)
    ORDER BY p.id, c.collection, p.created_at DESC
  )
  SELECT * FROM hits
  WHERE public.has_role(auth.uid(), 'admin')
  ORDER BY created_at DESC
  LIMIT 500;
$$;

GRANT EXECUTE ON FUNCTION public.get_collection_listings_report(integer, text) TO authenticated;