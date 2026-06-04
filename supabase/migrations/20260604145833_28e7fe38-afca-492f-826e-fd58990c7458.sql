ALTER TYPE lead_lifecycle_status ADD VALUE IF NOT EXISTS 'expired';

ALTER TABLE public.prospect_listings
  ADD COLUMN IF NOT EXISTS last_expiry_check_at timestamptz,
  ADD COLUMN IF NOT EXISTS expiry_check_status text;

CREATE INDEX IF NOT EXISTS idx_prospect_listings_expiry_check
  ON public.prospect_listings (last_expiry_check_at NULLS FIRST)
  WHERE is_active = true AND source_url IS NOT NULL;