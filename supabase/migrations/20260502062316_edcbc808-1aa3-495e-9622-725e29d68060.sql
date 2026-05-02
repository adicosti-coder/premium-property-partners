ALTER TABLE public.seo_competitor_snapshots
  ADD COLUMN IF NOT EXISTS competitor_schema_raw jsonb DEFAULT '[]'::jsonb;

ALTER TABLE public.seo_schema_validations
  ADD COLUMN IF NOT EXISTS error_locations jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS raw_blocks jsonb DEFAULT '[]'::jsonb;