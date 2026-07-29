DROP POLICY IF EXISTS "Allow public read access" ON public.blog_articles;

DROP POLICY IF EXISTS "Public articles are publicly readable" ON public.blog_articles;
CREATE POLICY "Public articles are publicly readable"
ON public.blog_articles
FOR SELECT
TO anon
USING (is_published = true AND is_premium = false);

DROP POLICY IF EXISTS "Authenticated users can read all published articles" ON public.blog_articles;
CREATE POLICY "Authenticated users can read published articles"
ON public.blog_articles
FOR SELECT
TO authenticated
USING (is_published = true);