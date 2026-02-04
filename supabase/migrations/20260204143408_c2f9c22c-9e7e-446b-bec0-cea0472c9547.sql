-- Add restrictive INSERT policy for captcha_logs
-- Only service_role should be able to insert (bypasses RLS anyway)
-- This prevents any authenticated users from inserting directly

CREATE POLICY "Block all direct inserts to captcha_logs"
ON public.captcha_logs
FOR INSERT
TO authenticated, anon
WITH CHECK (false);

-- Also add restrictive UPDATE policy to prevent any modifications
CREATE POLICY "Block all updates to captcha_logs"
ON public.captcha_logs
FOR UPDATE
TO authenticated, anon
USING (false)
WITH CHECK (false);