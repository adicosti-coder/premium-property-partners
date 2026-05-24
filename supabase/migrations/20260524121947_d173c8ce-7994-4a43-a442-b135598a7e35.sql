
-- 1) property_reviews: validate guest_email + length-bound public inserts
DROP POLICY IF EXISTS "Anyone can submit reviews" ON public.property_reviews;

CREATE POLICY "Anyone can submit reviews"
ON public.property_reviews
FOR INSERT
TO public
WITH CHECK (
  is_published = false
  AND (guest_email IS NULL OR guest_email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$')
  AND (guest_email IS NULL OR length(guest_email) <= 255)
  AND (guest_name IS NULL OR length(guest_name) <= 120)
  AND (title IS NULL OR length(title) <= 200)
  AND (content IS NULL OR length(content) <= 4000)
  AND rating BETWEEN 1 AND 5
);

-- 2) simulation_followup_emails: allow admins to read
CREATE POLICY "Admins can view followup emails"
ON public.simulation_followup_emails
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));
