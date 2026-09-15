ALTER TABLE public.wa_transaction_events DROP CONSTRAINT wa_transaction_events_event_check;
ALTER TABLE public.wa_transaction_events ADD CONSTRAINT wa_transaction_events_event_check
  CHECK (event = ANY (ARRAY['offer_sent','offer_failed','listing_opened','offer_followup','negotiation','offer_intro','offer_confirm','offer_meeting','offer_direct_chat','meeting_confirmed']));