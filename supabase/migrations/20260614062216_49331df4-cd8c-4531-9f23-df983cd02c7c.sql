CREATE OR REPLACE FUNCTION public.normalize_ro_phone(p text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  digits text;
BEGIN
  IF p IS NULL THEN
    RETURN NULL;
  END IF;

  IF p LIKE '%...%' OR p LIKE '%***%' OR p LIKE '%•%' THEN
    RETURN NULL;
  END IF;

  digits := regexp_replace(p, '\D', '', 'g');
  IF digits = '' THEN
    RETURN NULL;
  END IF;

  IF digits LIKE '0040%' THEN
    digits := substring(digits from 3);
  END IF;

  IF digits ~ '^40[237][0-9]{8}$' THEN
    RETURN '+' || digits;
  END IF;

  IF digits ~ '^0[237][0-9]{8}$' THEN
    RETURN '+4' || digits;
  END IF;

  IF digits ~ '^[237][0-9]{8}$' THEN
    RETURN '+40' || digits;
  END IF;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.extract_ro_phone_from_text(p_text text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  m text[];
  candidate text;
BEGIN
  IF p_text IS NULL OR p_text = '' THEN
    RETURN NULL;
  END IF;

  FOR m IN
    SELECT regexp_matches(
      p_text,
      '((\+?40|0040|0)?[[:space:]().-]*[237]([[:space:]().-]*[0-9]){8})',
      'g'
    )
  LOOP
    candidate := public.normalize_ro_phone(m[1]);
    IF candidate IS NOT NULL THEN
      RETURN candidate;
    END IF;
  END LOOP;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public._canonical_listing_url(url text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
  SELECT CASE
    WHEN url IS NULL OR btrim(url) = '' THEN NULL
    ELSE lower(regexp_replace(
      regexp_replace(
        regexp_replace(btrim(url), '[?#].*$', '', 'g'),
        '/+$', '', 'g'
      ),
      '^https?://(www\.)?', '', 'i'
    ))
  END
$$;

CREATE INDEX IF NOT EXISTS idx_prospect_listings_canonical_source_url
  ON public.prospect_listings (public._canonical_listing_url(source_url))
  WHERE source_url IS NOT NULL;

CREATE OR REPLACE FUNCTION public.enforce_agency_blocklist_on_prospect()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_domain text;
  v_canonical_url text;
  v_match boolean := false;
  v_historical record;
BEGIN
  IF NEW.phone_normalized IS NULL AND NEW.contact_phone IS NOT NULL THEN
    NEW.phone_normalized := public.normalize_ro_phone(NEW.contact_phone);
  ELSE
    NEW.phone_normalized := public.normalize_ro_phone(NEW.phone_normalized);
  END IF;

  IF NEW.phone_normalized IS NULL THEN
    NEW.phone_normalized := public.extract_ro_phone_from_text(
      concat_ws(E'\n', NEW.contact_phone, NEW.admin_notes, NEW.description, NEW.title)
    );
  END IF;

  IF NEW.contact_phone IS NULL AND NEW.phone_normalized IS NOT NULL THEN
    NEW.contact_phone := NEW.phone_normalized;
  END IF;

  IF NEW.is_active IS DISTINCT FROM true THEN
    RETURN NEW;
  END IF;

  v_domain := public._extract_domain(NEW.source_url);
  v_canonical_url := public._canonical_listing_url(NEW.source_url);

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
    RETURN NEW;
  END IF;

  SELECT pl.id, pl.prospect_type, pl.lifecycle_status, pl.is_active
    INTO v_historical
  FROM public.prospect_listings pl
  WHERE pl.id IS DISTINCT FROM NEW.id
    AND (
      (NEW.phone_normalized IS NOT NULL AND pl.phone_normalized = NEW.phone_normalized)
      OR (v_canonical_url IS NOT NULL AND public._canonical_listing_url(pl.source_url) = v_canonical_url)
    )
    AND (
      pl.prospect_type = 'agentie'
      OR pl.is_active IS DISTINCT FROM true
      OR pl.lifecycle_status IN ('expired', 'rejected', 'failed')
    )
  ORDER BY
    CASE WHEN pl.prospect_type = 'agentie' THEN 0 ELSE 1 END,
    COALESCE(pl.auto_blacklisted_at, pl.scraped_at, pl.created_at) DESC NULLS LAST
  LIMIT 1;

  IF FOUND THEN
    NEW.is_active := false;
    IF v_historical.prospect_type = 'agentie' THEN
      NEW.prospect_type := 'agentie';
    END IF;
    NEW.lifecycle_status := 'expired';
    NEW.auto_blacklisted_at := now();
    NEW.auto_blacklist_reason := COALESCE(
      NEW.auto_blacklist_reason,
      'historical_rejection_guard:' || v_historical.id::text
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.prospect_listings_pre_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_zone_key      text;
  v_size_bucket   int;
  v_existing      uuid;
  v_conv          numeric;
  v_under         numeric;
  v_predictive    numeric;
  v_archive_row   record;
BEGIN
  IF NEW.phone_normalized IS NULL AND NEW.contact_phone IS NOT NULL THEN
    NEW.phone_normalized := public.normalize_ro_phone(NEW.contact_phone);
  ELSE
    NEW.phone_normalized := public.normalize_ro_phone(NEW.phone_normalized);
  END IF;

  IF NEW.phone_normalized IS NULL THEN
    NEW.phone_normalized := public.extract_ro_phone_from_text(
      concat_ws(E'\n', NEW.contact_phone, NEW.admin_notes, NEW.description, NEW.title)
    );
  END IF;

  IF NEW.contact_phone IS NULL AND NEW.phone_normalized IS NOT NULL THEN
    NEW.contact_phone := NEW.phone_normalized;
  END IF;

  v_zone_key    := public.normalize_zone_key(NEW.zone, NEW.location);
  v_size_bucket := CASE
    WHEN NEW.size IS NULL THEN 0
    ELSE (round(NEW.size / 5.0)::int) * 5
  END;

  IF NEW.phone_normalized IS NOT NULL AND length(NEW.phone_normalized) >= 8 THEN
    NEW.dedup_key := NEW.phone_normalized
                     || '|' || v_zone_key
                     || '|' || coalesce(NEW.rooms::text, '0')
                     || '|' || v_size_bucket::text;
  END IF;

  NEW.tts_context_key := v_zone_key || '|' || coalesce(NEW.category::text, NEW.prospect_type, 'unknown');

  IF NEW.dedup_key IS NOT NULL THEN
    SELECT id INTO v_existing
    FROM public.prospect_listings
    WHERE dedup_key = NEW.dedup_key
      AND is_active = true
      AND (rejection_reason IS NULL OR rejection_reason <> 'duplicate')
    ORDER BY scraped_at DESC
    LIMIT 1;

    IF v_existing IS NOT NULL THEN
      NEW.is_active             := false;
      NEW.duplicate_of          := v_existing;
      NEW.rejection_reason      := 'duplicate';
      NEW.lifecycle_status      := 'failed'::public.lead_lifecycle_status;
      NEW.auto_blacklisted_at   := COALESCE(NEW.auto_blacklisted_at, now());
      NEW.auto_blacklist_reason := COALESCE(NEW.auto_blacklist_reason,
        'Cross-platform duplicate of ' || v_existing::text);
    END IF;
  END IF;

  IF NEW.migrated_from_scraper_id IS NOT NULL THEN
    SELECT conversion_probability, undervaluation_percent
      INTO v_archive_row
    FROM public.scraper_leads_archive_2026
    WHERE id = NEW.migrated_from_scraper_id;
    IF FOUND THEN
      v_conv  := v_archive_row.conversion_probability;
      v_under := v_archive_row.undervaluation_percent;
    END IF;
  END IF;

  v_conv  := COALESCE(NEW.conversion_probability, v_conv, 0);
  v_under := COALESCE(NEW.undervaluation_percent, v_under, 0);
  NEW.conversion_probability := v_conv;
  NEW.undervaluation_percent := v_under;

  v_predictive := COALESCE(NEW.lead_score, NEW.score, 0)::numeric
                  * (1 + LEAST(GREATEST(v_conv, 0), 1))
                  * (1 + LEAST(GREATEST(v_under, 0), 100) / 100.0);
  NEW.predictive_score := round(v_predictive, 2);

  RETURN NEW;
END;
$$;