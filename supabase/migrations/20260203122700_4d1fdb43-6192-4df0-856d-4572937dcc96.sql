-- Remove any RLS policies granted to the universal "public" role on sensitive tables.
-- The absence of a SELECT policy already denies reads for anon users under RLS,
-- and keeps intent clear for security scanners.

-- email_open_tracking
DROP POLICY IF EXISTS "Block public select on email_open_tracking" ON public.email_open_tracking;

-- referrals
DROP POLICY IF EXISTS "Block public select on referrals" ON public.referrals;
DROP POLICY IF EXISTS "Only service role can insert referrals" ON public.referrals;
