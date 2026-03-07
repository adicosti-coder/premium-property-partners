
-- Fix user_badges INSERT policy: restrict to SECURITY DEFINER functions (service_role)
DROP POLICY IF EXISTS "System can insert user badges" ON public.user_badges;
CREATE POLICY "System can insert user badges"
  ON public.user_badges
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Fix user_notifications INSERT policy: restrict to service_role
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.user_notifications;
CREATE POLICY "Service role can insert notifications"
  ON public.user_notifications
  FOR INSERT
  TO service_role
  WITH CHECK (true);
