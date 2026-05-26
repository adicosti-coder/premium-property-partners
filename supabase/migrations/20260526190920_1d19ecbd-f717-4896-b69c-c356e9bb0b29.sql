ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS indexing_status TEXT NOT NULL DEFAULT 'pending_check',
  ADD COLUMN IF NOT EXISTS last_google_check_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_properties_indexing_status ON public.properties(indexing_status);

ALTER TABLE public.prospect_listings
  ADD COLUMN IF NOT EXISTS indexing_status TEXT NOT NULL DEFAULT 'pending_check',
  ADD COLUMN IF NOT EXISTS last_google_check_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_prospect_listings_indexing_status ON public.prospect_listings(indexing_status);

COMMENT ON COLUMN public.properties.indexing_status IS 'Google Search Console indexing state: pending_check | INDEXED | CRAWLED_NOT_INDEXED | URL_NOT_ON_GOOGLE | NEUTRAL';
COMMENT ON COLUMN public.prospect_listings.indexing_status IS 'Google Search Console indexing state: pending_check | INDEXED | CRAWLED_NOT_INDEXED | URL_NOT_ON_GOOGLE | NEUTRAL';