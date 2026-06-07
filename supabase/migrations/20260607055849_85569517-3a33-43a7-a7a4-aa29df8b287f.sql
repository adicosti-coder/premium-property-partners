
-- 1) newsletter_subscribers: block any anon SELECT (subscribers come in via edge function with service role)
DROP POLICY IF EXISTS "Deny anon select on newsletter_subscribers" ON public.newsletter_subscribers;
CREATE POLICY "Deny anon select on newsletter_subscribers"
ON public.newsletter_subscribers
AS RESTRICTIVE
FOR SELECT
TO anon
USING (false);

-- 2) property_reviews: block direct anon SELECT (public reads go through get_public_property_reviews SECURITY DEFINER RPC which masks PII)
DROP POLICY IF EXISTS "Deny anon select on property_reviews" ON public.property_reviews;
CREATE POLICY "Deny anon select on property_reviews"
ON public.property_reviews
AS RESTRICTIVE
FOR SELECT
TO anon
USING (false);

-- 3) referrals: defense-in-depth restrictive deny for anon
DROP POLICY IF EXISTS "Deny anon select on referrals" ON public.referrals;
CREATE POLICY "Deny anon select on referrals"
ON public.referrals
AS RESTRICTIVE
FOR SELECT
TO anon
USING (false);
