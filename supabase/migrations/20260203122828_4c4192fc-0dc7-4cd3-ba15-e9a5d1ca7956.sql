-- Tighten referrals SELECT policy: remove email-based access
DROP POLICY IF EXISTS "Users can view their own referrals" ON public.referrals;

CREATE POLICY "Users can view their own referrals"
ON public.referrals
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (referrer_user_id = auth.uid())
);
