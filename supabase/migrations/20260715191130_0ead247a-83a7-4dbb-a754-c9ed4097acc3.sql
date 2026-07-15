
-- 1) Explicit admin-only SELECT policy on blog_ai_snapshots
DROP POLICY IF EXISTS "Admins can view blog ai snapshots" ON public.blog_ai_snapshots;
CREATE POLICY "Admins can view blog ai snapshots"
  ON public.blog_ai_snapshots
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 2) Remove redundant/confusing permissive-false insert policy
DROP POLICY IF EXISTS "Service role can insert access logs" ON public.admin_access_logs;

-- 3) Set immutable search_path on set_updated_at_column
ALTER FUNCTION public.set_updated_at_column() SET search_path = public;
