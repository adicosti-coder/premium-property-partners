CREATE TABLE IF NOT EXISTS public.make_lead_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  direction text NOT NULL CHECK (direction IN ('inbound','outbound')),
  event text NOT NULL,
  lead_id uuid,
  prospect_listing_id uuid,
  conversation_id uuid,
  phone_normalized text,
  message text,
  status text NOT NULL DEFAULT 'received',
  wa_message_id text,
  error text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS make_lead_events_created_idx ON public.make_lead_events (created_at DESC);
CREATE INDEX IF NOT EXISTS make_lead_events_phone_idx ON public.make_lead_events (phone_normalized);

GRANT SELECT ON public.make_lead_events TO authenticated;
GRANT ALL ON public.make_lead_events TO service_role;

ALTER TABLE public.make_lead_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view make lead events" ON public.make_lead_events;
CREATE POLICY "Admins can view make lead events"
ON public.make_lead_events
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Block anonymous access to make lead events" ON public.make_lead_events;
CREATE POLICY "Block anonymous access to make lead events"
ON public.make_lead_events
AS RESTRICTIVE
FOR ALL
TO anon
USING (false);