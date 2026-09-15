CREATE TABLE public.wa_transaction_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.wa_conversations(id) ON DELETE SET NULL,
  phone_normalized text NOT NULL,
  property_id uuid,
  property_name text,
  property_slug text,
  property_url text,
  price numeric,
  event text NOT NULL CHECK (event IN ('offer_sent','offer_failed','listing_opened')),
  status text NOT NULL DEFAULT 'sent',
  wa_message_id text,
  error text,
  source text NOT NULL DEFAULT 'admin',
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.wa_transaction_events TO authenticated;
GRANT ALL ON public.wa_transaction_events TO service_role;

ALTER TABLE public.wa_transaction_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage wa transaction events"
ON public.wa_transaction_events
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_wa_tx_events_created_at ON public.wa_transaction_events (created_at DESC);
CREATE INDEX idx_wa_tx_events_conversation ON public.wa_transaction_events (conversation_id);