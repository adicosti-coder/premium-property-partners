ALTER TABLE public.keyword_radar_queries DROP CONSTRAINT IF EXISTS keyword_radar_queries_source_check;
ALTER TABLE public.keyword_radar_queries ADD CONSTRAINT keyword_radar_queries_source_check
  CHECK (source IN ('onsite','gsc','auto_property','auto_zone','seed_complex','seed_periurban','seed_intent','manual'));