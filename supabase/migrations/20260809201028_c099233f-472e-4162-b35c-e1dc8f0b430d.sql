-- 1) Blog comments moderation flag
ALTER TABLE public.blog_comments
  ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false;

DROP POLICY IF EXISTS "Comments are publicly readable" ON public.blog_comments;

CREATE POLICY "Visible comments are publicly readable"
ON public.blog_comments
FOR SELECT
USING (is_hidden = false OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update any comment"
ON public.blog_comments
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 2) Hide internal sourcing columns on properties from anonymous visitors
REVOKE SELECT (
  original_source_url,
  original_description_raw,
  sanitization_log,
  migrated_from_prospect_id
) ON public.properties FROM anon;
