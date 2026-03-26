
CREATE TABLE public.rewrite_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_title text NOT NULL,
  listing_type text NOT NULL DEFAULT 'vanzare',
  tone text NOT NULL DEFAULT 'premium',
  language text NOT NULL DEFAULT 'ro',
  rewritten_title text,
  rewritten_short text,
  rewritten_full text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX idx_rewrite_cache_unique ON public.rewrite_cache (property_title, listing_type, tone);

ALTER TABLE public.rewrite_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read rewrite_cache" ON public.rewrite_cache FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow service write rewrite_cache" ON public.rewrite_cache FOR ALL TO service_role USING (true);

CREATE TABLE public.translation_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_text_hash text NOT NULL,
  source_lang text NOT NULL DEFAULT 'Romanian',
  target_lang text NOT NULL DEFAULT 'English',
  translated text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX idx_translation_cache_unique ON public.translation_cache (source_text_hash, source_lang, target_lang);

ALTER TABLE public.translation_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read translation_cache" ON public.translation_cache FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow service write translation_cache" ON public.translation_cache FOR ALL TO service_role USING (true);
