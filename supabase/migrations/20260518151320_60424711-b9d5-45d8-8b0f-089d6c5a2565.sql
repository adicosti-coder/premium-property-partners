CREATE OR REPLACE FUNCTION public.get_blog_hub_impressions_range(
  p_start_date timestamptz,
  p_end_date timestamptz
)
RETURNS TABLE(geo_location text, impressions bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT ba.geo_location, COUNT(*)::bigint AS impressions
  FROM public.blog_article_views v
  JOIN public.blog_articles ba ON ba.id = v.article_id
  WHERE v.viewed_at >= p_start_date
    AND v.viewed_at <= p_end_date
    AND ba.geo_location IS NOT NULL
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  GROUP BY ba.geo_location;
$$;

REVOKE ALL ON FUNCTION public.get_blog_hub_impressions_range(timestamptz, timestamptz) FROM public;
GRANT EXECUTE ON FUNCTION public.get_blog_hub_impressions_range(timestamptz, timestamptz) TO authenticated;