-- Hide comment author identity from every non-owner reader (anon already restricted).
REVOKE SELECT ON public.community_article_comments FROM authenticated;
GRANT SELECT (id, submission_id, content, created_at, updated_at)
  ON public.community_article_comments TO authenticated;

-- Owner-only helper so logged-in users can still see which comments are theirs
-- without needing column access to user_id.
CREATE OR REPLACE FUNCTION public.my_community_comment_ids(_submission_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id
  FROM public.community_article_comments c
  WHERE c.submission_id = _submission_id
    AND c.user_id = auth.uid()
    AND auth.uid() IS NOT NULL
$$;

REVOKE ALL ON FUNCTION public.my_community_comment_ids(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.my_community_comment_ids(uuid) TO authenticated;