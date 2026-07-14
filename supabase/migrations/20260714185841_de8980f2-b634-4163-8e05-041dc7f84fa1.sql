
-- Roll back the SECURITY DEFINER views + helper function created in the
-- previous migration; the Supabase linter flags SECURITY DEFINER views as
-- an error even when intentional, and we can achieve the same PII-hiding
-- outcome with column-level GRANTs instead.
DROP VIEW IF EXISTS public.blog_comments_public;
DROP VIEW IF EXISTS public.community_article_comments_public;
DROP FUNCTION IF EXISTS public.public_comment_author_name(uuid);

-- Restore public read on both comment tables so anon visitors can still
-- see the discussion thread.
DROP POLICY IF EXISTS "Authors and admins can read blog comments" ON public.blog_comments;
CREATE POLICY "Comments are publicly readable"
  ON public.blog_comments
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authors and admins can read community comments" ON public.community_article_comments;
CREATE POLICY "Comments are publicly readable"
  ON public.community_article_comments
  FOR SELECT
  USING (true);

-- Column-level privileges: revoke the anon role's blanket SELECT and re-grant
-- only the safe columns. Anonymous visitors can no longer read `user_id`,
-- eliminating the identity-correlation vector called out by the scanner.
-- Authenticated users keep full column access so the ownership check that
-- renders the delete button on their own comments keeps working.
REVOKE SELECT ON public.blog_comments FROM anon;
GRANT SELECT (id, article_id, author_name, content, created_at, updated_at)
  ON public.blog_comments TO anon;

REVOKE SELECT ON public.community_article_comments FROM anon;
GRANT SELECT (id, submission_id, content, created_at, updated_at)
  ON public.community_article_comments TO anon;
