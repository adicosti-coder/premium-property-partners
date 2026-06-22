
-- Allow anonymous and authenticated visitors to submit leads via public forms.
-- Previous policy "Only service role can insert leads" had WITH CHECK (false),
-- blocking all client-side inserts and starving the leads pipeline.
DROP POLICY IF EXISTS "Only service role can insert leads" ON public.leads;

CREATE POLICY "Public can submit leads"
ON public.leads
FOR INSERT
TO anon, authenticated
WITH CHECK (
  name IS NOT NULL AND length(trim(name)) BETWEEN 2 AND 200
  AND source IS NOT NULL AND length(trim(source)) BETWEEN 1 AND 100
);

GRANT INSERT ON public.leads TO anon, authenticated;
