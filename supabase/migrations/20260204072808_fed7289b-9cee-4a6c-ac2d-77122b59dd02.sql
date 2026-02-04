-- Tighten access to email_campaign_sends (privacy hardening)
-- Goal: prevent any client role (including admins) from enumerating recipient emails.
-- Edge/backend functions use the service role key and bypass RLS, so they can still INSERT.

ALTER TABLE public.email_campaign_sends ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view campaign sends" ON public.email_campaign_sends;
DROP POLICY IF EXISTS "Service role can manage campaign sends" ON public.email_campaign_sends;