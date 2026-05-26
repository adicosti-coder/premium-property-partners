
ALTER TABLE public.prospect_listings
  ADD COLUMN IF NOT EXISTS enriched_title text,
  ADD COLUMN IF NOT EXISTS enriched_description text,
  ADD COLUMN IF NOT EXISTS enriched_images jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS enrichment_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS enriched_at timestamptz,
  ADD COLUMN IF NOT EXISTS enrichment_error text,
  ADD COLUMN IF NOT EXISTS enrichment_saved_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_prospect_listings_enrichment_status
  ON public.prospect_listings (enrichment_status)
  WHERE enrichment_status IN ('pending','processing','failed');

-- Auto-trigger enrichment on insert for proprietar listings with content
CREATE OR REPLACE FUNCTION public.trigger_enrich_prospect_listing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE service_key text;
BEGIN
  IF NEW.prospect_type <> 'proprietar' THEN RETURN NEW; END IF;
  IF COALESCE(NEW.title, '') = '' AND COALESCE(NEW.description,'') = '' THEN RETURN NEW; END IF;
  IF NEW.enrichment_status NOT IN ('pending', NULL) THEN RETURN NEW; END IF;

  BEGIN service_key := current_setting('app.settings.service_role_key', true);
  EXCEPTION WHEN OTHERS THEN service_key := NULL; END;

  PERFORM net.http_post(
    url := 'https://mvzssjyzbwccioqvhjpo.supabase.co/functions/v1/enrich-prospect-listing',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'Authorization','Bearer ' || coalesce(service_key,'')
    ),
    body := jsonb_build_object('prospect_id', NEW.id, 'source', 'db_trigger'),
    timeout_milliseconds := 4000
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'trigger_enrich_prospect_listing failed: %', SQLERRM;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_enrich_prospect_listing ON public.prospect_listings;
CREATE TRIGGER trg_enrich_prospect_listing
AFTER INSERT ON public.prospect_listings
FOR EACH ROW EXECUTE FUNCTION public.trigger_enrich_prospect_listing();
