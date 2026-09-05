DROP POLICY IF EXISTS "Authenticated users can read published articles" ON public.blog_articles;
CREATE POLICY "Authenticated users can read published non-premium articles"
ON public.blog_articles
FOR SELECT
TO authenticated
USING (is_published = true AND is_premium = false);