-- Add per-keyword editable owner-only filters
ALTER TABLE public.scraper_search_keywords
  ADD COLUMN IF NOT EXISTS owner_filters jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.scraper_search_keywords.owner_filters IS
  'Editable owner-only filters per keyword. Shape: { text: string, url_hint: string }. Empty {} means use platform defaults from edge function.';
