-- Add is_premium column to blog_articles
ALTER TABLE public.blog_articles
ADD COLUMN is_premium boolean NOT NULL DEFAULT false;

-- Drop existing public read policy
DROP POLICY IF EXISTS "Published articles are publicly readable" ON public.blog_articles;

-- Create new policy for public articles (published AND not premium)
CREATE POLICY "Public articles are publicly readable"
ON public.blog_articles
FOR SELECT
USING (is_published = true AND is_premium = false);

-- Create policy for authenticated users to read all published articles (including premium)
CREATE POLICY "Authenticated users can read all published articles"
ON public.blog_articles
FOR SELECT
USING (is_published = true AND auth.uid() IS NOT NULL);