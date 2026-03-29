ALTER TABLE public.scraper_leads 
  ADD COLUMN admin_notes text DEFAULT NULL,
  ADD COLUMN tags text[] NOT NULL DEFAULT '{}'::text[];