
CREATE TABLE public.scraper_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  original_price numeric NOT NULL DEFAULT 0,
  extra_profit_3y numeric NOT NULL DEFAULT 0,
  monthly_extra numeric NOT NULL DEFAULT 0,
  lead_score integer NOT NULL DEFAULT 0,
  whatsapp_message text,
  url text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'new',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.scraper_leads ENABLE ROW LEVEL SECURITY;

-- Public read (scraper data is not sensitive PII)
CREATE POLICY "Anyone can read scraper leads"
  ON public.scraper_leads FOR SELECT
  TO public USING (true);

-- Only admins can modify
CREATE POLICY "Admins can manage scraper leads"
  ON public.scraper_leads FOR ALL
  TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Service role for scraper inserts
CREATE POLICY "Service role can manage scraper leads"
  ON public.scraper_leads FOR ALL
  TO service_role USING (true)
  WITH CHECK (true);
