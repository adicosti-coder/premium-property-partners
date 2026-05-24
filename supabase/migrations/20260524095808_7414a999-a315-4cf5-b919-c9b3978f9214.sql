
-- 1. Add scraper_lead_id FK column on prospect_listings
ALTER TABLE public.prospect_listings
  ADD COLUMN IF NOT EXISTS scraper_lead_id uuid
  REFERENCES public.scraper_leads_archive_2026(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_prospect_listings_scraper_lead_id
  ON public.prospect_listings(scraper_lead_id);

-- 2. Backfill from existing migrated_from_scraper_id where the FK target exists
UPDATE public.prospect_listings pl
   SET scraper_lead_id = pl.migrated_from_scraper_id
 WHERE pl.scraper_lead_id IS NULL
   AND pl.migrated_from_scraper_id IS NOT NULL
   AND EXISTS (SELECT 1 FROM public.scraper_leads_archive_2026 sl WHERE sl.id = pl.migrated_from_scraper_id);

-- 3. Auto-link trigger: when phone or URL is set, try to find matching scraper lead
CREATE OR REPLACE FUNCTION public.auto_link_scraper_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match uuid;
BEGIN
  IF NEW.scraper_lead_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Already migrated explicitly
  IF NEW.migrated_from_scraper_id IS NOT NULL THEN
    NEW.scraper_lead_id := NEW.migrated_from_scraper_id;
    RETURN NEW;
  END IF;

  -- Try match by normalized phone
  IF NEW.phone_normalized IS NOT NULL AND length(NEW.phone_normalized) >= 8 THEN
    SELECT id INTO v_match
      FROM public.scraper_leads_archive_2026
     WHERE public.normalize_ro_phone(phone) = NEW.phone_normalized
     ORDER BY created_at DESC
     LIMIT 1;
  END IF;

  -- Fallback: match by source URL
  IF v_match IS NULL AND NEW.source_url IS NOT NULL THEN
    SELECT id INTO v_match
      FROM public.scraper_leads_archive_2026
     WHERE url = NEW.source_url
     ORDER BY created_at DESC
     LIMIT 1;
  END IF;

  IF v_match IS NOT NULL THEN
    NEW.scraper_lead_id := v_match;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_link_scraper_lead ON public.prospect_listings;
CREATE TRIGGER trg_auto_link_scraper_lead
  BEFORE INSERT OR UPDATE OF phone_normalized, contact_phone, source_url
  ON public.prospect_listings
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_link_scraper_lead();

-- 4. Unified view with operational funnel status
CREATE OR REPLACE VIEW public.v_prospect_funnel
WITH (security_invoker = true)
AS
SELECT
  pl.id AS prospect_id,
  sl.id AS scraper_lead_id,
  COALESCE(pl.title, sl.title) AS title,
  COALESCE(pl.source_url, sl.url) AS source_url,
  COALESCE(pl.source_platform, sl.source) AS source_platform,
  pl.zone,
  pl.location,
  pl.price,
  COALESCE(pl.lead_score, sl.lead_score) AS lead_score,
  pl.score AS prospect_score,
  pl.phone_normalized,
  pl.contact_phone,
  sl.phone AS scraper_phone,
  pl.prospect_type,
  pl.lifecycle_status::text AS prospect_lifecycle,
  sl.lifecycle_status::text AS scraper_lifecycle,
  pl.auto_call_triggered_at,
  pl.voice_call_session_id,
  pl.call_summary,
  pl.tags,
  pl.is_active,
  COALESCE(pl.scraped_at, pl.created_at, sl.created_at) AS first_seen_at,
  GREATEST(COALESCE(pl.updated_at, 'epoch'::timestamptz), COALESCE(sl.updated_at, 'epoch'::timestamptz)) AS last_activity_at,
  CASE
    WHEN pl.id IS NULL AND sl.id IS NOT NULL THEN 'descoperit'
    WHEN pl.voice_call_session_id IS NOT NULL OR pl.call_summary IS NOT NULL THEN 'apelat'
    WHEN pl.auto_call_triggered_at IS NOT NULL THEN 'alocat_apel'
    WHEN pl.phone_normalized IS NOT NULL AND length(pl.phone_normalized) >= 8 THEN 'imbogatit_telefon'
    WHEN COALESCE(pl.lead_score, sl.lead_score, 0) > 0 THEN 'scorat'
    ELSE 'descoperit'
  END AS funnel_status
FROM public.prospect_listings pl
FULL OUTER JOIN public.scraper_leads_archive_2026 sl
  ON sl.id = pl.scraper_lead_id;

-- 5. RLS: views inherit RLS via security_invoker; restrict directly with grants
REVOKE ALL ON public.v_prospect_funnel FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.v_prospect_funnel TO authenticated;

COMMENT ON VIEW public.v_prospect_funnel IS
  'Unified B2C prospect funnel: joins prospect_listings ↔ scraper_leads_archive_2026 via scraper_lead_id. security_invoker=on so admin-only RLS on underlying tables applies.';
