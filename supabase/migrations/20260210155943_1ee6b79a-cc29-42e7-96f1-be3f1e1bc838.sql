
-- Drop existing policies first
DROP POLICY IF EXISTS "Bookings are publicly readable" ON public.bookings;
DROP POLICY IF EXISTS "Admins can view all bookings" ON public.bookings;
DROP POLICY IF EXISTS "Owners can view their property bookings" ON public.bookings;

-- Create a public availability view WITHOUT guest_name
CREATE OR REPLACE VIEW public.booking_availability
WITH (security_invoker = false) AS
SELECT
  id,
  property_id,
  check_in,
  check_out,
  status
FROM public.bookings;

GRANT SELECT ON public.booking_availability TO anon, authenticated;

-- Admins can see everything including guest_name
CREATE POLICY "Admins can view all bookings"
ON public.bookings
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Owners can see their own property bookings
CREATE POLICY "Owners can view their property bookings"
ON public.bookings
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.owner_properties op
    WHERE op.property_id = bookings.property_id::text::uuid
    AND op.user_id = auth.uid()
  )
);
