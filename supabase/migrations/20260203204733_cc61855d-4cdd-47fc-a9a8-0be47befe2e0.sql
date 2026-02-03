-- Fix blog_articles RLS policies to be PERMISSIVE for public access
-- Drop existing restrictive SELECT policies
DROP POLICY IF EXISTS "Public articles are publicly readable" ON public.blog_articles;
DROP POLICY IF EXISTS "Authenticated users can read all published articles" ON public.blog_articles;
DROP POLICY IF EXISTS "Admins can read all articles" ON public.blog_articles;

-- Recreate as PERMISSIVE policies (default, uses OR logic)
CREATE POLICY "Public articles are publicly readable" 
ON public.blog_articles 
FOR SELECT 
USING (is_published = true AND is_premium = false);

CREATE POLICY "Authenticated users can read all published articles" 
ON public.blog_articles 
FOR SELECT 
USING (is_published = true AND auth.uid() IS NOT NULL);

CREATE POLICY "Admins can read all articles" 
ON public.blog_articles 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));