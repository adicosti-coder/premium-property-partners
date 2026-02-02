-- Security fixes for error-level findings: referrals + email_click_tracking
-- Goal: ensure sensitive contact/click data is NOT publicly readable.

BEGIN;

-- =============================
-- email_click_tracking (admin-only read)
-- =============================
ALTER TABLE public.email_click_tracking ENABLE ROW LEVEL SECURITY;

-- Ensure SELECT is restricted to authenticated admins only
DROP POLICY IF EXISTS "Admins can view click tracking" ON public.email_click_tracking;
CREATE POLICY "Admins can view click tracking"
ON public.email_click_tracking
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Keep INSERT blocked for anon/authenticated (service role bypasses RLS)
DROP POLICY IF EXISTS "Only service role can insert click tracking" ON public.email_click_tracking;
CREATE POLICY "Only service role can insert click tracking"
ON public.email_click_tracking
FOR INSERT
TO public
WITH CHECK (false);

-- =============================
-- referrals (no public read; authenticated self-read + admin manage)
-- =============================
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Replace SELECT policy so it's not granted to "public" role
DROP POLICY IF EXISTS "Users can view their own referrals" ON public.referrals;
CREATE POLICY "Users can view their own referrals"
ON public.referrals
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR referrer_user_id = auth.uid()
  OR (auth.uid() IS NOT NULL AND referrer_email = (auth.jwt() ->> 'email'::text))
);

-- Replace admin manage policy so it's not granted to "public" role
DROP POLICY IF EXISTS "Admins can manage referrals" ON public.referrals;
CREATE POLICY "Admins can manage referrals"
ON public.referrals
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Ensure public can still submit referrals (INSERT) if policy was removed/renamed
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'referrals'
      AND policyname = 'Anyone can submit referrals'
  ) THEN
    EXECUTE 'CREATE POLICY "Anyone can submit referrals" ON public.referrals FOR INSERT TO public WITH CHECK (true)';
  END IF;
END $$;

COMMIT;
