
-- Track bulk campaign runs so we can cancel mid-flight
CREATE TABLE IF NOT EXISTS public.voice_campaign_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone TEXT,
  total_targets INTEGER NOT NULL DEFAULT 0,
  dialed_count INTEGER NOT NULL DEFAULT 0,
  cancelled BOOLEAN NOT NULL DEFAULT false,
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID,
  status TEXT NOT NULL DEFAULT 'running',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.voice_campaign_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view campaign runs"
ON public.voice_campaign_runs FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert campaign runs"
ON public.voice_campaign_runs FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update campaign runs"
ON public.voice_campaign_runs FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Add campaign reference + previous status snapshot on prospect_listings so we can revert on cancel
ALTER TABLE public.prospect_listings
  ADD COLUMN IF NOT EXISTS campaign_run_id UUID,
  ADD COLUMN IF NOT EXISTS pre_campaign_status TEXT;

CREATE INDEX IF NOT EXISTS idx_prospect_listings_campaign_run ON public.prospect_listings(campaign_run_id);
