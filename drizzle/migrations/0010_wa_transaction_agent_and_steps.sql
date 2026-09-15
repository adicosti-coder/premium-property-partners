ALTER TABLE public.wa_transaction_events
  ADD COLUMN IF NOT EXISTS agent_id uuid REFERENCES public.wa_agents(id) ON DELETE SET NULL;

ALTER TABLE public.wa_transaction_events
  DROP CONSTRAINT IF EXISTS wa_transaction_events_event_check;

ALTER TABLE public.wa_transaction_events
  ADD CONSTRAINT wa_transaction_events_event_check
  CHECK (event = ANY (ARRAY['offer_sent','offer_failed','listing_opened','offer_followup','negotiation']));

CREATE INDEX IF NOT EXISTS wa_transaction_events_agent_idx
  ON public.wa_transaction_events (agent_id, created_at DESC);

CREATE INDEX IF NOT EXISTS wa_transaction_events_conv_idx
  ON public.wa_transaction_events (conversation_id, created_at);