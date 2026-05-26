
ALTER TABLE public.prospect_listings
  ADD COLUMN IF NOT EXISTS enrichment_attempts INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS enrichment_next_retry_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_prospect_listings_enrichment_queue
  ON public.prospect_listings (enrichment_status, enrichment_next_retry_at)
  WHERE prospect_type = 'proprietar'
    AND is_active = true
    AND source_url IS NOT NULL;
