
-- 1. Helper: extract bare domain (strip protocol, www., path)
CREATE OR REPLACE FUNCTION public._extract_domain(url text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN url IS NULL OR url = '' THEN NULL
    ELSE lower(regexp_replace(
      regexp_replace(url, '^https?://', '', 'i'),
      '^(www\.)?([^/?#]+).*$', '\2'
    ))
  END
$$;

-- 2. Trigger function: auto-archive rows matching agency_blocklist
CREATE OR REPLACE FUNCTION public.enforce_agency_blocklist_on_prospect()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_domain text;
  v_match boolean := false;
BEGIN
  -- Only check when row would be visible
  IF NEW.is_active IS DISTINCT FROM true THEN
    RETURN NEW;
  END IF;

  v_domain := public._extract_domain(NEW.source_url);

  SELECT EXISTS (
    SELECT 1 FROM public.agency_blocklist ab
    WHERE (ab.phone_normalized IS NOT NULL
            AND NEW.phone_normalized IS NOT NULL
            AND ab.phone_normalized = NEW.phone_normalized)
       OR (ab.domain IS NOT NULL
            AND v_domain IS NOT NULL
            AND ab.domain = v_domain)
  ) INTO v_match;

  IF v_match THEN
    NEW.is_active := false;
    NEW.prospect_type := 'agentie';
    NEW.lifecycle_status := 'expired';
    NEW.auto_blacklisted_at := now();
    NEW.auto_blacklist_reason := COALESCE(NEW.auto_blacklist_reason, 'blocklist_auto_guard');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_agency_blocklist_ins ON public.prospect_listings;
DROP TRIGGER IF EXISTS trg_enforce_agency_blocklist_upd ON public.prospect_listings;

CREATE TRIGGER trg_enforce_agency_blocklist_ins
BEFORE INSERT ON public.prospect_listings
FOR EACH ROW EXECUTE FUNCTION public.enforce_agency_blocklist_on_prospect();

CREATE TRIGGER trg_enforce_agency_blocklist_upd
BEFORE UPDATE OF is_active, phone_normalized, source_url
ON public.prospect_listings
FOR EACH ROW EXECUTE FUNCTION public.enforce_agency_blocklist_on_prospect();

-- 3. Backfill: archive any active row matching blocklist (phone or domain)
UPDATE public.prospect_listings pl
SET is_active = false,
    prospect_type = 'agentie',
    lifecycle_status = 'expired',
    auto_blacklisted_at = now(),
    auto_blacklist_reason = COALESCE(auto_blacklist_reason, 'blocklist_backfill_guard')
WHERE pl.is_active = true
  AND (
    EXISTS (
      SELECT 1 FROM public.agency_blocklist ab
      WHERE ab.phone_normalized IS NOT NULL
        AND pl.phone_normalized IS NOT NULL
        AND ab.phone_normalized = pl.phone_normalized
    )
    OR EXISTS (
      SELECT 1 FROM public.agency_blocklist ab
      WHERE ab.domain IS NOT NULL
        AND public._extract_domain(pl.source_url) = ab.domain
    )
  );
