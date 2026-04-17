ALTER TABLE public.seo_audits
  ADD COLUMN IF NOT EXISTS local_relevance_score integer,
  ADD COLUMN IF NOT EXISTS local_entities_found jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS local_entities_missing jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS local_geo_keywords jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS local_recommendations jsonb DEFAULT '[]'::jsonb;