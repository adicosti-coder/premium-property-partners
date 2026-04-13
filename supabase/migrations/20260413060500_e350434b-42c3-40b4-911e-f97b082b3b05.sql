
ALTER TABLE public.scraper_leads
  ADD COLUMN IF NOT EXISTS neighborhood_slug TEXT,
  ADD COLUMN IF NOT EXISTS estimated_roi NUMERIC,
  ADD COLUMN IF NOT EXISTS seo_description TEXT,
  ADD COLUMN IF NOT EXISTS is_priority BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_scraper_leads_neighborhood ON public.scraper_leads (neighborhood_slug) WHERE neighborhood_slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_scraper_leads_priority ON public.scraper_leads (is_priority) WHERE is_priority = true;
CREATE INDEX IF NOT EXISTS idx_scraper_leads_created_date ON public.scraper_leads (created_at);
