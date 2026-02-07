-- Fix: Drop the existing public SELECT policy on cta_analytics and make it admin-only
DROP POLICY IF EXISTS "Admins can read CTA analytics" ON public.cta_analytics;

-- Create new restrictive admin-only SELECT policy
CREATE POLICY "Admins can read CTA analytics"
ON public.cta_analytics
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));