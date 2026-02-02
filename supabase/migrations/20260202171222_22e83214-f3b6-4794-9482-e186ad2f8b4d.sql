-- Drop existing SELECT policies and recreate as PERMISSIVE
DROP POLICY IF EXISTS "Public articles are publicly readable" ON blog_articles;
DROP POLICY IF EXISTS "Authenticated users can read all published articles" ON blog_articles;
DROP POLICY IF EXISTS "Admins can read all articles" ON blog_articles;

-- Recreate as PERMISSIVE policies (default) - OR logic
CREATE POLICY "Public articles are publicly readable" 
ON blog_articles 
FOR SELECT 
USING (is_published = true AND is_premium = false);

CREATE POLICY "Authenticated users can read all published articles" 
ON blog_articles 
FOR SELECT 
USING (is_published = true AND auth.uid() IS NOT NULL);

CREATE POLICY "Admins can read all articles" 
ON blog_articles 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));