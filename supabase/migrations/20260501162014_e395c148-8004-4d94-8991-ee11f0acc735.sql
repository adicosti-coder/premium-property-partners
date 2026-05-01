ALTER TABLE public.seo_overrides ADD COLUMN IF NOT EXISTS canonical_url text;
ALTER TABLE public.seo_override_history ADD COLUMN IF NOT EXISTS canonical_url text;
COMMENT ON COLUMN public.seo_overrides.canonical_url IS 'Absolute canonical URL (https://www.realtrust.ro/...) injected into <link rel="canonical">. Overrides the SEOHead default when set.';