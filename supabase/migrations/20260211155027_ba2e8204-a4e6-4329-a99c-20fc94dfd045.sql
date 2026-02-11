-- Drop the permissive INSERT policy that allows anyone to insert
DROP POLICY IF EXISTS "Anyone can subscribe to newsletter" ON public.newsletter_subscribers;

-- Create restrictive policy that blocks direct client INSERT (only service_role can insert)
CREATE POLICY "Only service role can insert newsletter subscribers"
ON public.newsletter_subscribers
FOR INSERT
WITH CHECK (false);