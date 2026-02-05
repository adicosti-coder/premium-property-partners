
-- Add RLS policies to email_campaign_sends table
-- This table contains recipient emails and user IDs - should be admin-only

-- Allow admins to perform all operations on email_campaign_sends
CREATE POLICY "Admins can manage email campaign sends"
ON public.email_campaign_sends
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Block public INSERT (service_role only via Edge Functions)
CREATE POLICY "Service role only can insert campaign sends"
ON public.email_campaign_sends
FOR INSERT
TO public
WITH CHECK (false);
