-- Defense-in-depth: explicit restrictive policy denying non-admin authenticated SELECT
-- (existing permissive SELECT for authenticated is admin-only, but this makes intent explicit
--  and protects against future permissive policies that might widen access)
CREATE POLICY "Deny non-admin authenticated select on property_reviews"
ON public.property_reviews
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));