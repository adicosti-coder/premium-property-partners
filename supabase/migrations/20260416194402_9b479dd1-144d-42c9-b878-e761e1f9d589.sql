
ALTER TABLE public.scraper_leads
  ADD COLUMN IF NOT EXISTS conversion_probability integer,
  ADD COLUMN IF NOT EXISTS predicted_market_value numeric,
  ADD COLUMN IF NOT EXISTS undervaluation_percent numeric,
  ADD COLUMN IF NOT EXISTS prediction_reasoning text,
  ADD COLUMN IF NOT EXISTS prediction_generated_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_scraper_leads_conversion_prob
  ON public.scraper_leads (conversion_probability DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_scraper_leads_undervaluation
  ON public.scraper_leads (undervaluation_percent DESC NULLS LAST);
