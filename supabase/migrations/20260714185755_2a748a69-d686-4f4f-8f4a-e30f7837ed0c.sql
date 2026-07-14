
-- 1. Helper: fetch a public author display name from profiles, bypassing RLS
--    so anonymous readers can still see who wrote a community comment.
--    Falls back to "Anonim" when the profile is missing or has no name.
CREATE OR REPLACE FUNCTION public.public_comment_author_name(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(NULLIF(TRIM(full_name), ''), 'Anonim')
  FROM public.profiles
  WHERE id = _user_id
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.public_comment_author_name(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_comment_author_name(uuid) TO anon, authenticated;

-- 2. Public view for blog comments: hides user_id from everyone except the
--    author and admins so identity correlation with other public tables
--    (e.g. profiles.full_name) is no longer possible for anon readers.
CREATE OR REPLACE VIEW public.blog_comments_public AS
SELECT
  c.id,
  c.article_id,
  c.author_name,
  c.content,
  c.created_at,
  c.updated_at,
  CASE
    WHEN auth.uid() = c.user_id OR public.has_role(auth.uid(), 'admin') THEN c.user_id
    ELSE NULL
  END AS user_id
FROM public.blog_comments c;

-- Definer semantics: the view runs with the owner's privileges so anon can
-- read comments even after we restrict base-table SELECT to owners/admins.
ALTER VIEW public.blog_comments_public SET (security_invoker = false);

GRANT SELECT ON public.blog_comments_public TO anon, authenticated;

-- 3. Public view for community article comments (mirrors the blog view and
--    also exposes the author display name so the join in the client can go
--    away and profiles RLS is not required for anon).
CREATE OR REPLACE VIEW public.community_article_comments_public AS
SELECT
  c.id,
  c.submission_id,
  c.content,
  c.created_at,
  c.updated_at,
  public.public_comment_author_name(c.user_id) AS author_name,
  CASE
    WHEN auth.uid() = c.user_id OR public.has_role(auth.uid(), 'admin') THEN c.user_id
    ELSE NULL
  END AS user_id
FROM public.community_article_comments c;

ALTER VIEW public.community_article_comments_public SET (security_invoker = false);

GRANT SELECT ON public.community_article_comments_public TO anon, authenticated;

-- 4. Restrict base-table SELECT: user_id is only visible to the author or
--    admins. Everyone else must go through the view.
DROP POLICY IF EXISTS "Comments are publicly readable" ON public.blog_comments;
CREATE POLICY "Authors and admins can read blog comments"
  ON public.blog_comments
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Comments are publicly readable" ON public.community_article_comments;
CREATE POLICY "Authors and admins can read community comments"
  ON public.community_article_comments
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin')
  );
