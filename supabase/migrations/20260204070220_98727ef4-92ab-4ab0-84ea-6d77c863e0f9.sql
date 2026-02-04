-- Fix newsletter_subscribers DELETE policy vulnerability
-- The current policy allows any authenticated user to delete records matching their email
-- This is vulnerable because the email comparison happens at query time, not at policy level

-- Drop the existing vulnerable policy
DROP POLICY IF EXISTS "Users can unsubscribe themselves" ON public.newsletter_subscribers;

-- Create a safer policy that uses a subquery comparison within the policy itself
-- This ensures the email match is enforced at the RLS level, preventing manipulation
CREATE POLICY "Users can unsubscribe themselves safely"
ON public.newsletter_subscribers
FOR DELETE
TO authenticated
USING (
  -- The email must exactly match the authenticated user's email from auth.users
  -- This comparison is done internally by Postgres, not influenced by user queries
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
);