
-- Prospect listings table for property scouting bot
CREATE TABLE public.prospect_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_platform text NOT NULL, -- 'OLX', 'Imobiliare.ro'
  source_url text NOT NULL UNIQUE,
  title text,
  description text,
  price numeric,
  currency text DEFAULT 'EUR',
  price_per_sqm numeric,
  location text,
  zone text, -- zona din Timișoara
  size numeric, -- mp
  rooms integer,
  floor text,
  year_built integer,
  features text[] DEFAULT '{}',
  images text[] DEFAULT '{}',
  contact_phone text,
  contact_name text,
  
  -- Scoring
  score integer DEFAULT 0, -- 0-100
  score_breakdown jsonb DEFAULT '{}',
  
  -- Status management
  status text DEFAULT 'new', -- new, reviewed, contacted, rejected, converted
  admin_notes text,
  assigned_to text,
  
  -- Metadata
  scraped_at timestamptz DEFAULT now(),
  last_seen_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for fast filtering
CREATE INDEX idx_prospect_listings_status ON public.prospect_listings(status);
CREATE INDEX idx_prospect_listings_score ON public.prospect_listings(score DESC);
CREATE INDEX idx_prospect_listings_zone ON public.prospect_listings(zone);
CREATE INDEX idx_prospect_listings_scraped ON public.prospect_listings(scraped_at DESC);

-- Enable RLS
ALTER TABLE public.prospect_listings ENABLE ROW LEVEL SECURITY;

-- Only admins can access
CREATE POLICY "Admins can manage prospect listings"
  ON public.prospect_listings
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Updated at trigger
CREATE TRIGGER update_prospect_listings_updated_at
  BEFORE UPDATE ON public.prospect_listings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
