-- Add admin SELECT policy for support/audit purposes
CREATE POLICY "Admins can view all advanced simulations"
ON public.advanced_simulations
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));