
-- Add Do-Not-Call (DNC) flags on prospects so autopilot can hard-skip them
ALTER TABLE public.prospect_listings
  ADD COLUMN IF NOT EXISTS do_not_call boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS do_not_call_at timestamptz,
  ADD COLUMN IF NOT EXISTS do_not_call_reason text;

CREATE INDEX IF NOT EXISTS idx_prospect_listings_dnc
  ON public.prospect_listings (do_not_call)
  WHERE do_not_call = true;
