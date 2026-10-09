ALTER TABLE public.analyzed_listings
  ADD COLUMN IF NOT EXISTS pdf_downloads integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pdf_downloaded_at timestamptz,
  ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'web',
  ADD COLUMN IF NOT EXISTS prospect_listing_id uuid,
  ADD COLUMN IF NOT EXISTS price_alert_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS price_alert_price numeric;
CREATE INDEX IF NOT EXISTS analyzed_listings_pdf_idx ON public.analyzed_listings (pdf_downloaded_at DESC) WHERE pdf_downloads > 0;