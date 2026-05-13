
-- =========================================================================
-- 1) NEW COLUMNS on prospect_listings
-- =========================================================================
ALTER TABLE public.prospect_listings
  ADD COLUMN IF NOT EXISTS dedup_key            TEXT,
  ADD COLUMN IF NOT EXISTS duplicate_of         UUID REFERENCES public.prospect_listings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS conversion_probability NUMERIC,
  ADD COLUMN IF NOT EXISTS undervaluation_percent NUMERIC,
  ADD COLUMN IF NOT EXISTS predictive_score     NUMERIC,
  ADD COLUMN IF NOT EXISTS tts_context_key      TEXT,
  ADD COLUMN IF NOT EXISTS rejection_reason     TEXT;  -- duplicate | landline | voip | unreachable

CREATE INDEX IF NOT EXISTS idx_prospect_listings_dedup_key       ON public.prospect_listings(dedup_key) WHERE dedup_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_prospect_listings_predictive      ON public.prospect_listings(predictive_score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_prospect_listings_tts_context_key ON public.prospect_listings(tts_context_key);
CREATE INDEX IF NOT EXISTS idx_prospect_listings_rejection       ON public.prospect_listings(rejection_reason) WHERE rejection_reason IS NOT NULL;

-- =========================================================================
-- 2) TTS context cache table (per zone × category)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.voice_tts_context_cache (
  context_key   TEXT PRIMARY KEY,        -- e.g. "cetate|hotelier"
  zone          TEXT,
  category      TEXT,
  summary       TEXT,                    -- normalized script snippet
  audio_url     TEXT,                    -- cached ElevenLabs MP3 url
  voice_id      TEXT,
  hits          INTEGER NOT NULL DEFAULT 0,
  last_used_at  TIMESTAMPTZ,
  generated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.voice_tts_context_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage tts context cache" ON public.voice_tts_context_cache;
CREATE POLICY "Admins manage tts context cache"
  ON public.voice_tts_context_cache
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP TRIGGER IF EXISTS trg_tts_context_cache_updated ON public.voice_tts_context_cache;
CREATE TRIGGER trg_tts_context_cache_updated
  BEFORE UPDATE ON public.voice_tts_context_cache
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================================
-- 3) Helper: normalize a zone string for dedup/grouping
-- =========================================================================
CREATE OR REPLACE FUNCTION public.normalize_zone_key(p_zone text, p_location text)
RETURNS text
LANGUAGE sql IMMUTABLE
SET search_path = public
AS $$
  SELECT lower(regexp_replace(
    coalesce(nullif(trim(p_zone), ''), nullif(trim(p_location), ''), 'unknown'),
    '[^a-z0-9]+', '_', 'gi'
  ))
$$;

-- =========================================================================
-- 4) BEFORE INSERT — compute dedup_key, tts_context_key, predictive_score
-- =========================================================================
CREATE OR REPLACE FUNCTION public.prospect_listings_pre_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  -- Normalize phone if missing
  IF NEW.phone_normalized IS NULL AND NEW.contact_phone IS NOT NULL THEN
    NEW.phone_normalized := public.normalize_ro_phone(NEW.contact_phone);
  END IF;

  v_zone_key    := public.normalize_zone_key(NEW.zone, NEW.location);
  v_size_bucket := CASE
    WHEN NEW.size IS NULL THEN 0
    ELSE (round(NEW.size / 5.0)::int) * 5    -- bucket of 5 sqm to absorb cross-platform rounding
  END;

  -- dedup_key: same owner phone + same neighborhood + same room count + similar size = duplicate listing across platforms
  IF NEW.phone_normalized IS NOT NULL AND length(NEW.phone_normalized) >= 8 THEN
    NEW.dedup_key := NEW.phone_normalized
                     || '|' || v_zone_key
                     || '|' || coalesce(NEW.rooms::text, '0')
                     || '|' || v_size_bucket::text;
  END IF;

  -- TTS grouping key (cartier × tip_proprietate)
  NEW.tts_context_key := v_zone_key || '|' || coalesce(NEW.category::text, NEW.prospect_type, 'unknown');

  -- Cross-platform duplicate check
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

  -- Pull conversion_probability / undervaluation_percent from scraper archive if available
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

  -- predictive_score = lead_score * (1 + conv_prob) * (1 + undervaluation/100)
  v_predictive := COALESCE(NEW.lead_score, NEW.score, 0)::numeric
                  * (1 + LEAST(GREATEST(v_conv, 0), 1))
                  * (1 + LEAST(GREATEST(v_under, 0), 100) / 100.0);
  NEW.predictive_score := round(v_predictive, 2);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prospect_listings_pre_insert ON public.prospect_listings;
CREATE TRIGGER trg_prospect_listings_pre_insert
  BEFORE INSERT ON public.prospect_listings
  FOR EACH ROW EXECUTE FUNCTION public.prospect_listings_pre_insert();

-- =========================================================================
-- 5) AFTER INSERT — auto enqueue & enrich phone via phone-lookup-enrich
-- =========================================================================
CREATE OR REPLACE FUNCTION public.prospect_listings_post_insert_enrich()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  service_key text;
  v_intel     record;
BEGIN
  IF NEW.phone_normalized IS NULL OR length(NEW.phone_normalized) < 8 THEN
    RETURN NEW;
  END IF;

  -- Skip already-rejected (duplicate) rows — no point burning Twilio credits
  IF NEW.rejection_reason IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Ensure phone_intelligence row exists
  INSERT INTO public.phone_intelligence (phone_number, last_seen)
  VALUES (NEW.phone_normalized, now())
  ON CONFLICT (phone_number) DO UPDATE SET last_seen = EXCLUDED.last_seen;

  -- If we already know it's bad → mark prospect immediately, do NOT call Twilio
  SELECT line_type, is_unreachable INTO v_intel
  FROM public.phone_intelligence
  WHERE phone_number = NEW.phone_normalized;

  IF v_intel.line_type IN ('landline', 'voip') OR v_intel.is_unreachable IS TRUE THEN
    UPDATE public.prospect_listings
       SET do_not_call = true,
           do_not_call_at = COALESCE(do_not_call_at, now()),
           do_not_call_reason = COALESCE(do_not_call_reason,
             CASE WHEN v_intel.is_unreachable THEN 'unreachable'
                  ELSE 'auto:' || v_intel.line_type END),
           rejection_reason = COALESCE(rejection_reason,
             CASE WHEN v_intel.is_unreachable THEN 'unreachable' ELSE v_intel.line_type END),
           is_active = false
     WHERE id = NEW.id;
    RETURN NEW;
  END IF;

  -- Otherwise, fire async lookup
  BEGIN service_key := current_setting('app.settings.service_role_key', true);
  EXCEPTION WHEN OTHERS THEN service_key := NULL; END;

  PERFORM net.http_post(
    url := 'https://mvzssjyzbwccioqvhjpo.supabase.co/functions/v1/phone-lookup-enrich',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || coalesce(service_key, '')
    ),
    body := jsonb_build_object('mode', 'single', 'phone', NEW.phone_normalized)
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'prospect_listings_post_insert_enrich failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prospect_listings_post_insert_enrich ON public.prospect_listings;
CREATE TRIGGER trg_prospect_listings_post_insert_enrich
  AFTER INSERT ON public.prospect_listings
  FOR EACH ROW EXECUTE FUNCTION public.prospect_listings_post_insert_enrich();

-- =========================================================================
-- 6) AFTER UPDATE on phone_intelligence — propagate DNC to prospects
-- =========================================================================
CREATE OR REPLACE FUNCTION public.phone_intelligence_propagate_dnc()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reason text;
BEGIN
  IF NEW.line_type IS NULL AND NEW.is_unreachable IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  -- Only act when the bad-state actually flipped on (avoid loops)
  IF (OLD.line_type IS NOT DISTINCT FROM NEW.line_type)
     AND (OLD.is_unreachable IS NOT DISTINCT FROM NEW.is_unreachable) THEN
    RETURN NEW;
  END IF;

  IF NEW.is_unreachable IS TRUE THEN
    v_reason := 'unreachable';
  ELSIF NEW.line_type IN ('landline', 'voip') THEN
    v_reason := NEW.line_type;
  ELSE
    RETURN NEW;
  END IF;

  UPDATE public.prospect_listings
     SET do_not_call = true,
         do_not_call_at = COALESCE(do_not_call_at, now()),
         do_not_call_reason = COALESCE(do_not_call_reason, 'auto:' || v_reason),
         rejection_reason = COALESCE(rejection_reason, v_reason),
         is_active = CASE WHEN lifecycle_status::text IN ('new', 'queued') THEN false ELSE is_active END
   WHERE phone_normalized = NEW.phone_number
     AND (do_not_call IS DISTINCT FROM true OR rejection_reason IS NULL);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_phone_intelligence_propagate_dnc ON public.phone_intelligence;
CREATE TRIGGER trg_phone_intelligence_propagate_dnc
  AFTER UPDATE OF line_type, is_unreachable ON public.phone_intelligence
  FOR EACH ROW EXECUTE FUNCTION public.phone_intelligence_propagate_dnc();

-- =========================================================================
-- 7) Helper view: rejection stats for admin dashboard (last 30 days)
-- =========================================================================
CREATE OR REPLACE VIEW public.prospect_injection_rejection_stats AS
SELECT
  date_trunc('day', COALESCE(scraped_at, created_at))::date AS day,
  rejection_reason,
  count(*)::int AS count
FROM public.prospect_listings
WHERE rejection_reason IS NOT NULL
  AND COALESCE(scraped_at, created_at) > now() - interval '30 days'
GROUP BY 1, 2
ORDER BY 1 DESC, 2;

-- The view inherits RLS from base table; admins can already SELECT prospect_listings.

-- =========================================================================
-- 8) RPC consumed by admin UI — aggregate counters
-- =========================================================================
CREATE OR REPLACE FUNCTION public.get_prospect_injection_rejection_summary(p_days int DEFAULT 7)
RETURNS TABLE(rejection_reason text, count_24h bigint, count_period bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    coalesce(rejection_reason, 'unknown')::text AS rejection_reason,
    count(*) FILTER (WHERE COALESCE(scraped_at, created_at) > now() - interval '24 hours')::bigint AS count_24h,
    count(*)::bigint AS count_period
  FROM public.prospect_listings
  WHERE rejection_reason IS NOT NULL
    AND COALESCE(scraped_at, created_at) > now() - (p_days || ' days')::interval
  GROUP BY rejection_reason
  ORDER BY count_period DESC;
$$;

REVOKE ALL ON FUNCTION public.get_prospect_injection_rejection_summary(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_prospect_injection_rejection_summary(int) TO authenticated;

-- =========================================================================
-- 9) Backfill tts_context_key on existing rows (one-time)
-- =========================================================================
UPDATE public.prospect_listings
   SET tts_context_key = public.normalize_zone_key(zone, location) || '|' || coalesce(category::text, prospect_type, 'unknown')
 WHERE tts_context_key IS NULL;
