
-- Fix 1: Tighten leads SELECT policy to authenticated only
DROP POLICY IF EXISTS "Admins can read leads" ON public.leads;
CREATE POLICY "Admins can read leads"
  ON public.leads
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Fix 2: Tighten referrals SELECT policy to authenticated only  
DROP POLICY IF EXISTS "Only admins can view referrals directly" ON public.referrals;
CREATE POLICY "Only admins can view referrals directly"
  ON public.referrals
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Fix 3: Recreate booking_availability view with SECURITY INVOKER
DROP VIEW IF EXISTS public.booking_availability;
CREATE VIEW public.booking_availability
WITH (security_invoker = true) AS
  SELECT id, property_id, check_in, check_out, status
  FROM public.bookings;

-- Add public SELECT policy on bookings so the SECURITY INVOKER view works for availability checks
CREATE POLICY "Public can view booking availability"
  ON public.bookings
  FOR SELECT
  TO anon
  USING (true);
