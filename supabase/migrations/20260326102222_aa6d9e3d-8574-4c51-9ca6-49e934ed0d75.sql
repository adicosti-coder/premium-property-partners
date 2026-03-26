
CREATE TABLE public.image_caption_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url text NOT NULL,
  property_name text NOT NULL,
  language text NOT NULL DEFAULT 'ro',
  caption text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX idx_image_caption_cache_unique ON public.image_caption_cache (image_url, language);

ALTER TABLE public.image_caption_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read" ON public.image_caption_cache FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow service insert/update" ON public.image_caption_cache FOR ALL TO service_role USING (true);
