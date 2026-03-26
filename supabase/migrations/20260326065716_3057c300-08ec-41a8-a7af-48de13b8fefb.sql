
CREATE TABLE public.advisor_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_slug text NOT NULL,
  language text NOT NULL DEFAULT 'ro',
  content jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_advisor_cache_slug_lang ON public.advisor_cache (property_slug, language);

ALTER TABLE public.advisor_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read advisor cache"
  ON public.advisor_cache FOR SELECT
  TO public USING (true);

CREATE POLICY "Service role can manage advisor cache"
  ON public.advisor_cache FOR ALL
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Admins can manage advisor cache"
  ON public.advisor_cache FOR ALL
  TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
