ALTER TABLE public.prospect_listings
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS stale_alerted_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_prospect_listings_contact_email
  ON public.prospect_listings (contact_email)
  WHERE contact_email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_prospect_listings_stale_alert
  ON public.prospect_listings (published_at)
  WHERE is_active AND stale_alerted_at IS NULL;

ALTER TABLE public.owner_outreach_messages
  ADD COLUMN IF NOT EXISTS email text;