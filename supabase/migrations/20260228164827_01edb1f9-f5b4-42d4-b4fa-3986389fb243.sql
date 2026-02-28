
CREATE TABLE public.property_live_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_slug TEXT NOT NULL UNIQUE,
  price_per_night NUMERIC,
  rating NUMERIC,
  reviews_count INTEGER,
  booking_url TEXT,
  booking_com_url TEXT,
  last_price_update TIMESTAMP WITH TIME ZONE,
  last_rating_update TIMESTAMP WITH TIME ZONE,
  scrape_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Allow public read access (prices are public info)
ALTER TABLE public.property_live_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read live data" ON public.property_live_data
  FOR SELECT USING (true);

CREATE POLICY "Only admins can modify live data" ON public.property_live_data
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Allow service role (edge functions) to upsert
CREATE POLICY "Service role can manage live data" ON public.property_live_data
  FOR ALL USING (auth.role() = 'service_role');
