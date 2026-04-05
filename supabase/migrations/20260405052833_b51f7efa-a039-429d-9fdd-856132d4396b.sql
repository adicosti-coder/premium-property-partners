
-- Table for editable search keywords used by the scraper
CREATE TABLE public.scraper_search_keywords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword text NOT NULL,
  platform text DEFAULT 'General',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.scraper_search_keywords ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage scraper keywords"
  ON public.scraper_search_keywords
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can read keywords"
  ON public.scraper_search_keywords
  FOR SELECT
  TO service_role
  USING (true);

-- Add search_keyword column to scraper_leads to track which keyword found each lead
ALTER TABLE public.scraper_leads ADD COLUMN IF NOT EXISTS search_keyword text;

-- Seed with default keywords from the current hardcoded queries
INSERT INTO public.scraper_search_keywords (keyword, platform) VALUES
  ('apartament vanzare timisoara site:imobiliare.ro', 'imobiliare.ro'),
  ('apartament vanzare timisoara site:olx.ro', 'OLX'),
  ('apartament vanzare timisoara site:storia.ro', 'Storia.ro'),
  ('apartament vanzare timisoara site:publi24.ro', 'Publi24'),
  ('apartament vanzare timisoara site:facebook.com/marketplace', 'Facebook Marketplace'),
  ('apartament vanzare timisoara "facebook.com/groups"', 'Grupuri Facebook'),
  ('apartament vanzare timisoara site:bursaimobiliara.ro', 'BursaImobiliara.ro');
