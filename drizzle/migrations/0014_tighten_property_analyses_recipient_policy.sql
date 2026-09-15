DROP POLICY IF EXISTS "Recipients can view their own analyses" ON public.property_analyses;

CREATE POLICY "Recipients can view their own analyses"
ON public.property_analyses
FOR SELECT
TO authenticated
USING (
  recipient_email IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = auth.uid()
      AND u.email_confirmed_at IS NOT NULL
      AND lower(u.email) = lower(property_analyses.recipient_email)
  )
);