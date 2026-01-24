-- Fix CRITICAL security issues

-- 1. Fix leads table - only admins can read leads (not all authenticated users)
DROP POLICY IF EXISTS "Authenticated users can read leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can delete leads" ON public.leads;

CREATE POLICY "Admins can read leads"
ON public.leads
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete leads"
ON public.leads
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 2. Fix referrals table - restrict SELECT to referrer or admin only
DROP POLICY IF EXISTS "Users can view their own referrals" ON public.referrals;

CREATE POLICY "Users can view their own referrals"
ON public.referrals
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR referrer_user_id = auth.uid()
  OR (auth.uid() IS NOT NULL AND referrer_email = (auth.jwt() ->> 'email'::text))
);

-- 3. Fix cta_analytics - use has_role instead of hardcoded emails
DROP POLICY IF EXISTS "Admins can read CTA analytics" ON public.cta_analytics;

CREATE POLICY "Admins can read CTA analytics"
ON public.cta_analytics
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 4. Fix shared_poi_links UPDATE policy - only link owner or service role
DROP POLICY IF EXISTS "Service can update import counts" ON public.shared_poi_links;

CREATE POLICY "Link owners can update their own links"
ON public.shared_poi_links
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);