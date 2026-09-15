ALTER TABLE public.wa_transaction_events
  DROP CONSTRAINT IF EXISTS wa_transaction_events_event_check;
ALTER TABLE public.wa_transaction_events
  ADD CONSTRAINT wa_transaction_events_event_check
  CHECK (event = ANY (ARRAY['offer_sent','offer_failed','listing_opened','offer_followup','negotiation','offer_intro','offer_confirm']));

CREATE TABLE IF NOT EXISTS public.wa_daily_digests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sent_at timestamptz NOT NULL DEFAULT now(),
  hours integer NOT NULL DEFAULT 24,
  recipient text NOT NULL,
  subject text NOT NULL,
  stats jsonb NOT NULL DEFAULT '{}'::jsonb,
  html text NOT NULL,
  email_sent boolean NOT NULL DEFAULT false,
  error text
);

CREATE INDEX IF NOT EXISTS wa_daily_digests_sent_at_idx
  ON public.wa_daily_digests (sent_at DESC);

GRANT SELECT ON public.wa_daily_digests TO authenticated;
GRANT ALL ON public.wa_daily_digests TO service_role;

ALTER TABLE public.wa_daily_digests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view daily digests" ON public.wa_daily_digests;
CREATE POLICY "Admins can view daily digests"
  ON public.wa_daily_digests FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Block anonymous access to daily digests" ON public.wa_daily_digests;
CREATE POLICY "Block anonymous access to daily digests"
  ON public.wa_daily_digests
  AS RESTRICTIVE FOR ALL TO anon
  USING (false);

REVOKE ALL ON public.wa_daily_digests FROM anon;