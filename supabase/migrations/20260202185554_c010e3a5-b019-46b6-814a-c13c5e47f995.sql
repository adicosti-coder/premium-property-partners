-- Fix remaining ERROR-level findings: referrals + leads
BEGIN;

-- =============================
-- referrals: remove direct public inserts (use backend function instead)
-- =============================
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can submit referrals" ON public.referrals;
CREATE POLICY "Only service role can insert referrals"
ON public.referrals
FOR INSERT
TO public
WITH CHECK (false);

-- =============================
-- leads: ensure admin UPDATE/DELETE are not granted to public role
-- =============================
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can update leads" ON public.leads;
CREATE POLICY "Admins can update leads"
ON public.leads
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can delete leads" ON public.leads;
CREATE POLICY "Admins can delete leads"
ON public.leads
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

COMMIT;
