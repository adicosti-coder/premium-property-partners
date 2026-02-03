-- Fix security scan ERRORs: restrict public exposure of sensitive tables

-- 1) email_open_tracking: ensure only authenticated admins can SELECT
DROP POLICY IF EXISTS "Admins can view open tracking" ON public.email_open_tracking;
DROP POLICY IF EXISTS "Service role can manage open tracking" ON public.email_open_tracking;
DROP POLICY IF EXISTS "Block public select on email_open_tracking" ON public.email_open_tracking;

CREATE POLICY "Admins can view open tracking"
ON public.email_open_tracking
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Defense-in-depth: make explicit that anonymous/public users cannot read
CREATE POLICY "Block public select on email_open_tracking"
ON public.email_open_tracking
FOR SELECT
TO public
USING (false);

-- 2) referrals: defense-in-depth explicit deny for public/anon SELECT
DROP POLICY IF EXISTS "Block public select on referrals" ON public.referrals;

CREATE POLICY "Block public select on referrals"
ON public.referrals
FOR SELECT
TO public
USING (false);
