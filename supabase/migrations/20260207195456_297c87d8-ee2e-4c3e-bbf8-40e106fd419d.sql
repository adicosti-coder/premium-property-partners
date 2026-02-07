-- Add SEO fields to residential_complexes
ALTER TABLE public.residential_complexes
ADD COLUMN slug TEXT UNIQUE,
ADD COLUMN meta_title_ro TEXT,
ADD COLUMN meta_title_en TEXT,
ADD COLUMN meta_description_ro TEXT,
ADD COLUMN meta_description_en TEXT,
ADD COLUMN seo_keywords TEXT[] DEFAULT '{}',
ADD COLUMN neighborhood TEXT,
ADD COLUMN latitude DECIMAL(10, 7),
ADD COLUMN longitude DECIMAL(10, 7),
ADD COLUMN features TEXT[] DEFAULT '{}',
ADD COLUMN features_en TEXT[] DEFAULT '{}';

-- Create index for slug lookups
CREATE INDEX idx_residential_complexes_slug ON public.residential_complexes(slug);
CREATE INDEX idx_residential_complexes_neighborhood ON public.residential_complexes(neighborhood);