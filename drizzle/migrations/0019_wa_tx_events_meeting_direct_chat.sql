ALTER TABLE public.wa_transaction_events
  DROP CONSTRAINT IF EXISTS wa_transaction_events_event_check;

ALTER TABLE public.wa_transaction_events
  ADD CONSTRAINT wa_transaction_events_event_check
  CHECK (event = ANY (ARRAY[
    'offer_sent'::text,
    'offer_failed'::text,
    'listing_opened'::text,
    'offer_followup'::text,
    'negotiation'::text,
    'offer_intro'::text,
    'offer_confirm'::text,
    'offer_meeting'::text,
    'offer_direct_chat'::text
  ]));