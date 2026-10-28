ALTER TABLE public.prospect_listings
  ADD COLUMN IF NOT EXISTS andrei_queued_at timestamptz,
  ADD COLUMN IF NOT EXISTS andrei_call_after timestamptz,
  ADD COLUMN IF NOT EXISTS andrei_queue_scenario text;
CREATE INDEX IF NOT EXISTS idx_prospect_andrei_call_after ON public.prospect_listings (andrei_call_after) WHERE andrei_call_after IS NOT NULL;