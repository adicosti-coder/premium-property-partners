ALTER TABLE public.prospect_listings
  ADD COLUMN IF NOT EXISTS quality_score integer,
  ADD COLUMN IF NOT EXISTS quality_analysis jsonb,
  ADD COLUMN IF NOT EXISTS quality_analyzed_at timestamptz;

COMMENT ON COLUMN public.prospect_listings.quality_score IS 'Property Quality Score 0-100 derived from multimodal photo analysis';
COMMENT ON COLUMN public.prospect_listings.quality_analysis IS 'Structured AI photo analysis: condition, finishes, hotel readiness, flags';

CREATE INDEX IF NOT EXISTS idx_prospect_listings_quality_score
  ON public.prospect_listings (quality_score DESC NULLS LAST);