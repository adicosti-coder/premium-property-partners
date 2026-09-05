CREATE OR REPLACE FUNCTION public.get_premium_article_slugs()
RETURNS TABLE (slug text, title text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ba.slug, ba.title
  FROM public.blog_articles ba
  WHERE ba.is_published = true
    AND ba.is_premium = true
    AND ba.slug IS NOT NULL
    AND ba.slug <> ''
$$;

GRANT EXECUTE ON FUNCTION public.get_premium_article_slugs() TO anon, authenticated, service_role;