-- Fix: Replace hardcoded email admin check with role-based check on cta_analytics
DROP POLICY IF EXISTS "Admins can read CTA analytics" ON public.cta_analytics;
CREATE POLICY "Admins can read CTA analytics"
ON public.cta_analytics
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));