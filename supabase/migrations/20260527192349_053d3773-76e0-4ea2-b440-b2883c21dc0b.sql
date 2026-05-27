CREATE OR REPLACE FUNCTION public.auto_classify_agency()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_count int;
  v_domain text;
  v_permissive boolean := false;
  v_reason text := null;
BEGIN
  -- Manual owner override always wins.
  IF NEW.prospect_type = 'proprietar' THEN
    RETURN NEW;
  END IF;

  -- Read global permissive-mode flag (single-row site_settings).
  SELECT COALESCE(spam_shield_permissive_mode, false) INTO v_permissive
  FROM public.site_settings LIMIT 1;

  v_domain := public.extract_url_domain(NEW.source_url);

  -- (0) WHITELIST: phone or domain whitelisted → force owner, skip everything.
  IF NEW.phone_normalized IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.agency_whitelist WHERE phone_normalized = NEW.phone_normalized
  ) THEN
    NEW.prospect_type := 'proprietar';
    RETURN NEW;
  END IF;
  IF v_domain IS NOT NULL AND v_domain <> '' AND EXISTS (
    SELECT 1 FROM public.agency_whitelist WHERE domain = v_domain
  ) THEN
    NEW.prospect_type := 'proprietar';
    RETURN NEW;
  END IF;

  -- (a) blocklist by phone
  IF NEW.phone_normalized IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.agency_blocklist WHERE phone_normalized = NEW.phone_normalized
  ) THEN
    NEW.prospect_type := 'agentie';
    v_reason := 'agency_blocklist_phone';
    IF v_permissive THEN
      NEW.is_active := true;
      NEW.lifecycle_status := 'to_review';
      NEW.tags := COALESCE(NEW.tags, ARRAY[]::text[])
        || (CASE WHEN 'suspect_spam' = ANY(COALESCE(NEW.tags, ARRAY[]::text[]))
              THEN ARRAY[]::text[] ELSE ARRAY['suspect_spam'] END);
      NEW.last_failure_reason := v_reason;
    ELSE
      NEW.is_active := false;
      NEW.last_failure_reason := v_reason;
    END IF;
    RETURN NEW;
  END IF;

  -- (a') blocklist by domain
  IF v_domain IS NOT NULL AND v_domain <> '' AND EXISTS (
    SELECT 1 FROM public.agency_blocklist WHERE domain = v_domain
  ) THEN
    NEW.prospect_type := 'agentie';
    v_reason := 'agency_blocklist_domain';
    IF v_permissive THEN
      NEW.is_active := true;
      NEW.lifecycle_status := 'to_review';
      NEW.tags := COALESCE(NEW.tags, ARRAY[]::text[])
        || (CASE WHEN 'suspect_spam' = ANY(COALESCE(NEW.tags, ARRAY[]::text[]))
              THEN ARRAY[]::text[] ELSE ARRAY['suspect_spam'] END);
      NEW.last_failure_reason := v_reason;
    ELSE
      NEW.is_active := false;
      NEW.last_failure_reason := v_reason;
    END IF;
    RETURN NEW;
  END IF;

  -- (b) recurrence: > 3 distinct prospects with same phone in last 14 days
  IF NEW.phone_normalized IS NOT NULL THEN
    SELECT COUNT(*) INTO v_count
    FROM public.prospect_listings
    WHERE phone_normalized = NEW.phone_normalized
      AND scraped_at > now() - interval '14 days'
      AND id <> NEW.id;
    IF v_count >= 3 THEN
      NEW.prospect_type := 'agentie';
      v_reason := 'multi_listing_recurrence(' || (v_count + 1) || ')';
      INSERT INTO public.agency_blocklist (phone_normalized, reason, notes, source_prospect_id)
      VALUES (NEW.phone_normalized, 'multi_listing', 'Auto: ' || (v_count + 1) || ' anunțuri în 14 zile', NEW.id)
      ON CONFLICT DO NOTHING;
      IF v_permissive THEN
        NEW.is_active := true;
        NEW.lifecycle_status := 'to_review';
        NEW.tags := COALESCE(NEW.tags, ARRAY[]::text[])
          || (CASE WHEN 'suspect_spam' = ANY(COALESCE(NEW.tags, ARRAY[]::text[]))
                THEN ARRAY[]::text[] ELSE ARRAY['suspect_spam'] END);
      END IF;
      NEW.last_failure_reason := v_reason;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;