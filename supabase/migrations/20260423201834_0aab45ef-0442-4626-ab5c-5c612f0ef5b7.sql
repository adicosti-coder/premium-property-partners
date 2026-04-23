-- 1. Add column
ALTER TABLE public.prospect_listings
  ADD COLUMN IF NOT EXISTS search_keywords text[] NOT NULL DEFAULT '{}';

-- 2. Backfill from scraper_leads_archive_2026 via migrated_from_scraper_id
UPDATE public.prospect_listings pl
SET search_keywords = ARRAY[sl.search_keyword]::text[]
FROM public.scraper_leads_archive_2026 sl
WHERE pl.migrated_from_scraper_id = sl.id
  AND sl.search_keyword IS NOT NULL
  AND sl.search_keyword <> ''
  AND (pl.search_keywords IS NULL OR array_length(pl.search_keywords, 1) IS NULL);

-- 3. Trigger function: auto-fill from scraper archive on insert/migration
CREATE OR REPLACE FUNCTION public.fill_prospect_search_keywords()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  kw text;
BEGIN
  IF (NEW.search_keywords IS NULL OR array_length(NEW.search_keywords, 1) IS NULL)
     AND NEW.migrated_from_scraper_id IS NOT NULL THEN
    SELECT search_keyword INTO kw
    FROM public.scraper_leads_archive_2026
    WHERE id = NEW.migrated_from_scraper_id;
    IF kw IS NOT NULL AND kw <> '' THEN
      NEW.search_keywords := ARRAY[kw]::text[];
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fill_prospect_search_keywords ON public.prospect_listings;
CREATE TRIGGER trg_fill_prospect_search_keywords
  BEFORE INSERT OR UPDATE OF migrated_from_scraper_id ON public.prospect_listings
  FOR EACH ROW EXECUTE FUNCTION public.fill_prospect_search_keywords();