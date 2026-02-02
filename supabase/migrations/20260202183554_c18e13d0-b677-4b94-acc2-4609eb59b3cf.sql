-- Fix email_click_tracking table security
-- The table should only be accessible by service role for INSERT (from edge functions)
-- and by admins for SELECT

-- First, drop the existing INSERT policy that uses true
DROP POLICY IF EXISTS "Service role can insert click tracking" ON email_click_tracking;

-- Create a more restrictive INSERT policy
-- Since edge functions use service_role key which bypasses RLS,
-- we can set this to false for anon/authenticated users
-- Edge functions with service_role will still work
CREATE POLICY "Only service role can insert click tracking" 
ON email_click_tracking 
FOR INSERT 
WITH CHECK (false);

-- The SELECT policy is already correct (admin only)
-- Verify it exists, if not create it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'email_click_tracking' 
    AND policyname = 'Admins can view click tracking'
  ) THEN
    EXECUTE 'CREATE POLICY "Admins can view click tracking" ON email_click_tracking FOR SELECT USING (has_role(auth.uid(), ''admin''::app_role))';
  END IF;
END $$;