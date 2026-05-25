
-- Fix service-role policies that used USING false / WITH CHECK false
-- Replace with policies properly scoped to the service_role with true conditions.

-- email_ab_assignments
DROP POLICY IF EXISTS "Service role can manage assignments" ON public.email_ab_assignments;
CREATE POLICY "Service role can manage assignments"
ON public.email_ab_assignments
AS PERMISSIVE
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- simulation_followup_emails
DROP POLICY IF EXISTS "Service role can manage followup emails" ON public.simulation_followup_emails;
CREATE POLICY "Service role can manage followup emails"
ON public.simulation_followup_emails
AS PERMISSIVE
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
