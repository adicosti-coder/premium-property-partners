-- Lock down leads table: only service role can insert (via submit-lead edge function)
DROP POLICY IF EXISTS "Anyone can submit a lead" ON public.leads;

CREATE POLICY "Only service role can insert leads"
ON public.leads
FOR INSERT
TO public
WITH CHECK (false);
