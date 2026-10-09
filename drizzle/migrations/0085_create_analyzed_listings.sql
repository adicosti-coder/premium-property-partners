CREATE TABLE public.analyzed_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL,
  phone_number text,
  extracted_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  calculated_score integer CHECK (calculated_score BETWEEN 0 AND 100),
  negotiation_range jsonb NOT NULL DEFAULT '{}'::jsonb,
  market_result jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX analyzed_listings_url_created_idx ON public.analyzed_listings (url, created_at DESC);
GRANT SELECT ON public.analyzed_listings TO authenticated;
GRANT ALL ON public.analyzed_listings TO service_role;
ALTER TABLE public.analyzed_listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read analyzed listings" ON public.analyzed_listings
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));