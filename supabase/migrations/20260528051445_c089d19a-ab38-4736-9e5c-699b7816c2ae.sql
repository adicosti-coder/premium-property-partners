-- 1) Explicit RESTRICTIVE deny on guest_guides for non-admins (defense in depth)
DROP POLICY IF EXISTS "Deny non-admin select guest_guides" ON public.guest_guides;
CREATE POLICY "Deny non-admin select guest_guides"
  ON public.guest_guides
  AS RESTRICTIVE
  FOR SELECT
  TO anon, authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 2) Remove slack_webhook_url from DB (moved to env secret)
ALTER TABLE public.system_health_thresholds DROP COLUMN IF EXISTS slack_webhook_url;