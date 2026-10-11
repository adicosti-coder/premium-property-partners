CREATE OR REPLACE FUNCTION public.tm_norm(t text) RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT lower(translate(coalesce(t,''), 'ăâîșşțţĂÂÎȘŞȚŢ', 'aaisstt' || 'aaisstt'))
$$;

CREATE OR REPLACE FUNCTION public.match_timisoara_zone_from_title(_title text) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT z.name
  FROM public.timisoara_zones z
  CROSS JOIN LATERAL unnest(array_prepend(z.name, z.aliases)) w
  WHERE z.is_active AND z.kind IN ('cartier','localitate') AND length(w) >= 4
    AND public.tm_norm(_title) ~ ('(^|[^a-z])' || public.tm_norm(w) || '([^a-z]|$)')
  ORDER BY (z.kind = 'cartier') DESC, strpos(public.tm_norm(_title), public.tm_norm(w))
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.align_prospect_zone_with_title() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE m text;
BEGIN
  m := public.match_timisoara_zone_from_title(NEW.title);
  IF m IS NOT NULL AND public.tm_norm(coalesce(NEW.zone,'')) NOT LIKE '%' || public.tm_norm(m) || '%' THEN
    NEW.zone := m;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_align_prospect_zone_with_title ON public.prospect_listings;
CREATE TRIGGER trg_align_prospect_zone_with_title BEFORE INSERT OR UPDATE OF title, zone ON public.prospect_listings
FOR EACH ROW EXECUTE FUNCTION public.align_prospect_zone_with_title();