
-- Remove the overly permissive anon policy on bookings (exposes guest_name)
DROP POLICY IF EXISTS "Public can view booking availability" ON public.bookings;

-- Revert view to security_invoker=false (SECURITY DEFINER) - this is intentional
-- so that public availability checks work without exposing the full bookings table
DROP VIEW IF EXISTS public.booking_availability;
CREATE VIEW public.booking_availability
WITH (security_invoker = false) AS
  SELECT id, property_id, check_in, check_out, status
  FROM public.bookings;
