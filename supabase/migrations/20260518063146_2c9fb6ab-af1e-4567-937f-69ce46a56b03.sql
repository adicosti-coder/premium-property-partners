CREATE OR REPLACE FUNCTION public.get_blog_hub_impressions(p_days integer DEFAULT 30)
RETURNS TABLE(geo_location text, impressions bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT ba.geo_location, COUNT(*)::bigint AS impressions
  FROM public.blog_article_views v
  JOIN public.blog_articles ba ON ba.id = v.article_id
  WHERE v.viewed_at > now() - (p_days || ' days')::interval
    AND ba.geo_location IS NOT NULL
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  GROUP BY ba.geo_location;
$$;

REVOKE ALL ON FUNCTION public.get_blog_hub_impressions(integer) FROM public;
GRANT EXECUTE ON FUNCTION public.get_blog_hub_impressions(integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.dedupe_hub_click_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.cta_type = 'form_submit'
     AND NEW.metadata IS NOT NULL
     AND NEW.metadata ? 'event'
     AND NEW.metadata->>'event' = 'blog_location_hub_click'
     AND NEW.session_id IS NOT NULL
     AND length(NEW.session_id) >= 8
  THEN
    IF EXISTS (
      SELECT 1
      FROM public.cta_analytics
      WHERE session_id = NEW.session_id
        AND cta_type = 'form_submit'
        AND metadata->>'event' = 'blog_location_hub_click'
        AND metadata->>'location_slug' IS NOT DISTINCT FROM NEW.metadata->>'location_slug'
        AND metadata->>'source' IS NOT DISTINCT FROM NEW.metadata->>'source'
        AND created_at > now() - interval '60 seconds'
    ) THEN
      RETURN NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS dedupe_hub_click_event_before_insert ON public.cta_analytics;
CREATE TRIGGER dedupe_hub_click_event_before_insert
BEFORE INSERT ON public.cta_analytics
FOR EACH ROW
EXECUTE FUNCTION public.dedupe_hub_click_event();