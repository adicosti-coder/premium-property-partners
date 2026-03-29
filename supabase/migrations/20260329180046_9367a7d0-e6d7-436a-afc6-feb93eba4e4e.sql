
ALTER TABLE phone_intelligence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage phone intelligence"
ON phone_intelligence
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can manage phone intelligence"
ON phone_intelligence
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
