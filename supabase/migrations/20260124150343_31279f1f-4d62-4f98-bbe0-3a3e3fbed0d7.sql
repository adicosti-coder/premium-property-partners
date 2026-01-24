-- Fix bookings table - only owners/admins can see bookings, not public
DROP POLICY IF EXISTS "Bookings are publicly readable" ON public.bookings;

-- Owners can view bookings for their properties
CREATE POLICY "Owners can view their property bookings"
ON public.bookings
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.owner_properties op
    WHERE op.property_id::text = bookings.property_id::text
    AND op.user_id = auth.uid()
  )
);