ALTER TABLE public.prospect_listings ADD COLUMN IF NOT EXISTS outreach_scheduled_at timestamptz;
COMMENT ON COLUMN public.prospect_listings.outreach_scheduled_at IS 'When a queued owner outreach (outreach_status = queued) may be sent (09:05 Europe/Bucharest).';
CREATE INDEX IF NOT EXISTS idx_prospect_listings_outreach_queued
  ON public.prospect_listings (outreach_scheduled_at)
  WHERE outreach_status = 'queued';
ALTER TABLE public.wa_publish_consents ADD COLUMN IF NOT EXISTS has_custom_notes boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.wa_publish_consents.has_custom_notes IS 'Owner sent corrections/requests (price, parking, photos, availability, hotel calc) after the buttons outreach — warm hand-off.';