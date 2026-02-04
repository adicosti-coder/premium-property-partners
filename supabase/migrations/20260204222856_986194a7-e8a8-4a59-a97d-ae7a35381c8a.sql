-- Ensure RLS is enabled
ALTER TABLE blog_articles ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Allow public read access" ON blog_articles;

-- Create policy for anonymous public read access to published articles
CREATE POLICY "Allow public read access" ON blog_articles
FOR SELECT
TO anon
USING (is_published = true);