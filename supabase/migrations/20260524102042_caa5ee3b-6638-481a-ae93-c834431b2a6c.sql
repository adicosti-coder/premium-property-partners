-- Twilio pre-validation columns for scraper leads ingestion pipeline
ALTER TABLE public.scraper_leads_archive_2026
  ADD COLUMN IF NOT EXISTS is_phone_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS phone_e164 text,
  ADD COLUMN IF NOT EXISTS phone_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS phone_line_type text;

CREATE INDEX IF NOT EXISTS idx_scraper_leads_phone_verified
  ON public.scraper_leads_archive_2026 (is_phone_verified) WHERE is_phone_verified = true;
CREATE INDEX IF NOT EXISTS idx_scraper_leads_phone_e164
  ON public.scraper_leads_archive_2026 (phone_e164);