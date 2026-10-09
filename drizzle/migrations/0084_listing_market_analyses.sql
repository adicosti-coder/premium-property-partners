CREATE TABLE public.listing_market_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  channel text NOT NULL DEFAULT 'web',
  phone text,
  source_url text,
  title text,
  zone text,
  rooms int,
  size numeric,
  price numeric,
  total_score int,
  negotiation_eur numeric,
  target_low numeric,
  target_high numeric,
  result jsonb
);
GRANT SELECT ON public.listing_market_analyses TO authenticated;
GRANT ALL ON public.listing_market_analyses TO service_role;
ALTER TABLE public.listing_market_analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read listing analyses" ON public.listing_market_analyses FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX ON public.listing_market_analyses (created_at DESC);