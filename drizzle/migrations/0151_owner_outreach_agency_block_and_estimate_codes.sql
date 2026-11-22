-- 1) Short estimate codes for clean links realtrust.ro/e/<code>
CREATE OR REPLACE FUNCTION public.gen_estimate_code()
RETURNS text
LANGUAGE plpgsql
VOLATILE
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  alphabet constant text := 'abcdefghjkmnpqrstuvwxyz23456789';
  b bytea := extensions.gen_random_bytes(8);
  code text := '';
  i int;
BEGIN
  FOR i IN 0..7 LOOP
    code := code || substr(alphabet, (get_byte(b, i) % 31) + 1, 1);
  END LOOP;
  RETURN code;
END $$;

ALTER TABLE public.prospect_listings
  ADD COLUMN IF NOT EXISTS short_code text DEFAULT public.gen_estimate_code();

CREATE UNIQUE INDEX IF NOT EXISTS prospect_listings_short_code_key
  ON public.prospect_listings (short_code);

-- Public lookup: returns only what the analysis page needs (no contact data).
CREATE OR REPLACE FUNCTION public.get_estimate_link(p_code text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT jsonb_build_object(
    'zone', left(COALESCE(NULLIF(trim(p.zone), ''), NULLIF(trim(p.location), ''), 'Timișoara'), 60),
    'listing_type', CASE WHEN p.category::text = 'vanzare' THEN 'vanzare' ELSE 'inchiriere' END,
    'source_url', CASE WHEN p.source_url ~* '^https://' THEN left(p.source_url, 500) END
  )
  FROM public.prospect_listings p
  WHERE p_code ~ '^[A-Za-z0-9]{7,8}$'
    AND p.short_code = lower(p_code)
  LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.get_estimate_link(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_estimate_link(text) TO anon, authenticated, service_role;

-- 2) Agency detection (mirror of supabase/functions/_shared/ownerOutreachEligibility.ts)
CREATE OR REPLACE FUNCTION public.agency_text_norm(t text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(
    translate(lower(COALESCE(t, '')), 'ăâîșşțţ', 'aaisstt'),
    '(https?://)?(www\.)?[a-z0-9-]+\.(ro|com|eu|net)\M\S*', ' ', 'g'),
    '[_|/\\-]+', ' ', 'g'),
    '\s+', ' ', 'g'),
    '\m(fara|nu( (doresc|dorim|vreau|vrem|accept|acceptam|lucrez|lucram|colaborez|colaboram))?( cu)?|exclus|rog) (\w+ ){0,2}?(agenti\w*|agent\w*|intermediar\w*|imobiliare|broker\w*)( imobiliar\w*)?', ' ', 'g'),
    '\m(agenti\w*|agent\w*|intermediar\w*)( imobiliar\w*)? (va rog )?(sa nu|sa se abtina|abtineti\w*|nu sunati|nu ma contactati)\M', ' ', 'g')
$$;

CREATE OR REPLACE FUNCTION public.prospect_is_agency(p public.prospect_listings)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT COALESCE(p.seller_type, '') IN ('agentie', 'agency')
      OR COALESCE(p.agency_suspicion_score, 0) >= 70
      OR COALESCE(p.owner_sentiment, '') = 'agentie'
      OR public.agency_text_norm(p.prospect_type) IN ('agentie', 'agency', 'agent', 'broker', 'agent imobiliar')
      OR public.agency_text_norm(concat_ws(' ', p.contact_name, array_to_string(p.tags, ' ')))
           ~ '\m(agenti\w*|agency|agent|agenta|broker\w*|imobiliare|srl|consultant\w* imobiliar\w*)\M'
      OR public.agency_text_norm(p.title)
           ~ '\m(agenti\w*|agency|agent|agenta|broker\w*|srl|consultant\w* imobiliar\w*)\M'
$$;

-- Agencies are marked blocked_agency automatically; an admin confirming the
-- seller as private lifts the mark.
CREATE OR REPLACE FUNCTION public.mark_prospect_blocked_agency()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF public.prospect_is_agency(NEW) THEN
    IF NEW.outreach_status IS NULL OR NEW.outreach_status = 'queued' THEN
      NEW.outreach_status := 'blocked_agency';
      NEW.outreach_status_at := now();
      NEW.outreach_scheduled_at := NULL;
      NEW.outreach_error := 'agentie';
    END IF;
  ELSIF TG_OP = 'UPDATE'
        AND NEW.outreach_status = 'blocked_agency'
        AND NEW.seller_type = 'privat'
        AND OLD.seller_type IS DISTINCT FROM NEW.seller_type THEN
    NEW.outreach_status := NULL;
    NEW.outreach_status_at := now();
    NEW.outreach_error := NULL;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_zz_mark_blocked_agency ON public.prospect_listings;
CREATE TRIGGER trg_zz_mark_blocked_agency
  BEFORE INSERT OR UPDATE ON public.prospect_listings
  FOR EACH ROW EXECUTE FUNCTION public.mark_prospect_blocked_agency();

-- 3) Automatic first contact only for confirmed private owners with score > 60.
CREATE OR REPLACE FUNCTION public.fire_make_outreach()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE secret text; v_phone text;
BEGIN
  IF NEW.outreach_status IS NOT NULL THEN RETURN NEW; END IF;
  IF public.prospect_is_agency(NEW) THEN RETURN NEW; END IF;
  IF COALESCE(NEW.seller_type, '') <> 'privat' OR COALESCE(NEW.lead_score, 0) <= 60 THEN RETURN NEW; END IF;
  IF NEW.is_active IS FALSE THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' THEN
    -- Only when automatic scoring first lifts a fresh listing above 60.
    IF COALESCE(OLD.lead_score, 0) > 60 THEN RETURN NEW; END IF;
    IF NEW.created_at < now() - interval '7 days' THEN RETURN NEW; END IF;
  END IF;
  IF COALESCE(NEW.do_not_call, false) OR NEW.auto_blacklisted_at IS NOT NULL THEN RETURN NEW; END IF;
  IF NEW.lifecycle_status IN ('rejected','expired','failed','posted') THEN RETURN NEW; END IF;
  v_phone := public.normalize_ro_phone(COALESCE(NEW.phone_normalized, NEW.contact_phone));
  IF v_phone IS NULL OR v_phone !~ '^\+407[0-9]{8}$' THEN RETURN NEW; END IF;
  BEGIN secret := public.get_cron_reconcile_secret(); EXCEPTION WHEN OTHERS THEN secret := NULL; END;
  IF secret IS NULL OR secret = '' THEN RETURN NEW; END IF;
  PERFORM net.http_post(
    url := 'https://mvzssjyzbwccioqvhjpo.supabase.co/functions/v1/outreach-dispatch',
    headers := jsonb_build_object('Content-Type','application/json','x-cron-secret',secret),
    body := jsonb_build_object('prospect_id', NEW.id)
  );
  RETURN NEW;
END $function$;

DROP TRIGGER IF EXISTS trg_fire_make_outreach ON public.prospect_listings;
CREATE TRIGGER trg_fire_make_outreach
  AFTER INSERT OR UPDATE OF lead_score ON public.prospect_listings
  FOR EACH ROW EXECUTE FUNCTION public.fire_make_outreach();

-- 4) Score-based outbound queue: same rule (agencies never, private only, score > 60).
CREATE OR REPLACE FUNCTION public.enqueue_wa_outbound_on_high_score()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_enabled boolean;
  v_threshold integer;
  v_template text;
  v_phone text;
  v_duration integer := 12;
  v_msg text;
BEGIN
  SELECT auto_outbound_enabled, outbound_threshold, outbound_template
    INTO v_enabled, v_threshold, v_template
  FROM public.property_vision_settings WHERE id = 1;

  IF COALESCE(v_enabled, false) = false THEN
    RETURN NEW;
  END IF;

  IF public.prospect_is_agency(NEW) OR NEW.outreach_status = 'blocked_agency' THEN
    RETURN NEW;
  END IF;
  IF COALESCE(NEW.seller_type, '') <> 'privat' OR COALESCE(NEW.lead_score, 0) <= 60 THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF COALESCE(OLD.lead_score, -1) = COALESCE(NEW.lead_score, -1)
       AND COALESCE(OLD.quality_analyzed_at, 'epoch'::timestamptz) = COALESCE(NEW.quality_analyzed_at, 'epoch'::timestamptz)
       AND COALESCE(OLD.do_not_call, false) = COALESCE(NEW.do_not_call, false) THEN
      RETURN NEW;
    END IF;
    IF COALESCE(NEW.lead_score, 0) < COALESCE(v_threshold, 70) THEN
      RETURN NEW;
    END IF;
  END IF;

  IF NEW.lifecycle_status IN ('posted', 'expired', 'failed') THEN
    RETURN NEW;
  END IF;

  IF COALESCE(NEW.do_not_call, false) AND NOT public.wa_is_technical_block_only(NEW.do_not_call_reason) THEN
    RETURN NEW;
  END IF;

  IF NEW.lifecycle_status = 'rejected'
     AND NOT (COALESCE(NEW.do_not_call, false) AND public.wa_is_technical_block_only(NEW.do_not_call_reason)) THEN
    RETURN NEW;
  END IF;

  v_phone := public.normalize_ro_phone(COALESCE(NEW.phone_normalized, NEW.contact_phone));
  IF v_phone IS NULL OR v_phone !~ '^\+407[0-9]{8}$' THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.phone_intelligence
    WHERE phone_number = v_phone
      AND (COALESCE(is_blacklisted, false) OR COALESCE(is_unreachable, false))
  ) THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.wa_outbound_queue
    WHERE phone_normalized = v_phone
      AND status IN ('pending', 'sending', 'sent')
  ) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.wa_outbound_queue (
    phone_normalized, prospect_listing_id, template_name, template_language,
    template_params, status, priority, source
  ) VALUES (
    v_phone, NEW.id, COALESCE(v_template, 'intake_prospect_apartments'), 'ro',
    '[]'::jsonb,
    'pending',
    CASE WHEN TG_OP = 'INSERT' THEN 7 WHEN COALESCE(NEW.lead_score, 0) >= 85 THEN 10 ELSE 5 END,
    CASE WHEN TG_OP = 'INSERT' THEN 'auto_import' ELSE 'auto_score' END
  )
  ON CONFLICT DO NOTHING;

  IF NOT EXISTS (
    SELECT 1 FROM public.owner_outreach_messages
    WHERE prospect_listing_id = NEW.id
      AND status IN ('draft', 'auto_queued', 'sent')
  ) THEN
    v_msg := 'Bună ziua! Am văzut anunțul dvs. "' || COALESCE(LEFT(NEW.title, 90), 'apartament') || '"'
      || CASE WHEN NEW.price IS NOT NULL
              THEN ' la ' || TRIM(TO_CHAR(NEW.price, 'FM999G999G999')) || ' ' || COALESCE(NEW.currency, 'EUR')
              ELSE '' END
      || '. Vă propun o colaborare de administrare RealTrust pe ' || v_duration
      || ' luni, cu venit lunar estimat si zero batai de cap. Va sun pentru detalii - Adrian Costi, RealTrust Timisoara.';

    INSERT INTO public.owner_outreach_messages (
      prospect_listing_id, offer_price, currency, duration_months, message, channel, status
    ) VALUES (
      NEW.id, NEW.price, COALESCE(NEW.currency, 'EUR'), v_duration, v_msg, 'whatsapp', 'auto_queued'
    );
  END IF;

  RETURN NEW;
END;
$function$;