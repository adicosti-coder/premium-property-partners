CREATE OR REPLACE FUNCTION public.is_classified_portal_domain(p_domain text)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM unnest(ARRAY['publi24.ro','olx.ro','storia.ro','homezz.ro','anuntul.ro','imobiliare.ro',
      'facebook.com','flatspotter.com','m2bomber.com','romimo.ro','lajumate.ro','laproprietar.ro']) d
    WHERE lower(btrim(COALESCE(p_domain, ''))) = d OR lower(btrim(COALESCE(p_domain, ''))) LIKE '%.' || d
  )
$$;
GRANT EXECUTE ON FUNCTION public.is_classified_portal_domain(text) TO authenticated, service_role;

-- Un portal general de anunțuri nu poate fi niciodată blocat ca domeniu întreg.
CREATE OR REPLACE FUNCTION public.reject_portal_domain_blocklist()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.domain IS NOT NULL AND public.is_classified_portal_domain(NEW.domain) THEN
    IF NEW.phone_normalized IS NULL THEN RETURN NULL; END IF;
    NEW.domain := NULL;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_reject_portal_domain_blocklist ON public.agency_blocklist;
CREATE TRIGGER trg_reject_portal_domain_blocklist BEFORE INSERT OR UPDATE OF domain ON public.agency_blocklist
FOR EACH ROW EXECUTE FUNCTION public.reject_portal_domain_blocklist();

DELETE FROM public.agency_blocklist WHERE domain IS NOT NULL AND phone_normalized IS NULL AND public.is_classified_portal_domain(domain);
UPDATE public.agency_blocklist SET domain = NULL WHERE domain IS NOT NULL AND public.is_classified_portal_domain(domain);

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

  -- (a') blocklist by domain (never for general listing portals)
  IF v_domain IS NOT NULL AND v_domain <> '' AND NOT public.is_classified_portal_domain(v_domain) AND EXISTS (
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
      -- Un număr confirmat manual ca privat nu reintră automat în lista de agenții.
      IF NOT EXISTS (SELECT 1 FROM public.prospect_listings c
                     WHERE c.private_confirmed_at IS NOT NULL
                       AND right(regexp_replace(COALESCE(c.phone_normalized, c.contact_phone, ''), '\D', '', 'g'), 9)
                           = right(regexp_replace(NEW.phone_normalized, '\D', '', 'g'), 9)) THEN
        INSERT INTO public.agency_blocklist (phone_normalized, reason, notes, source_prospect_id)
        VALUES (NEW.phone_normalized, 'multi_listing', 'Auto: ' || (v_count + 1) || ' anunțuri în 14 zile', NEW.id)
        ON CONFLICT DO NOTHING;
      END IF;
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

CREATE OR REPLACE FUNCTION public.enforce_agency_blocklist_on_prospect()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
            AND ab.domain = v_domain
            AND NOT public.is_classified_portal_domain(v_domain))
  ) INTO v_match;

  IF v_match THEN
    NEW.is_active := false;
    NEW.prospect_type := 'agentie';
    NEW.lifecycle_status := 'expired';
    NEW.auto_blacklisted_at := now();
    NEW.auto_blacklist_reason := COALESCE(NEW.auto_blacklist_reason, 'blocklist_auto_guard');
    RETURN NEW;
  END IF;

  -- Confirmarea manuală ca privat sau reactivarea explicită de către admin nu sunt anulate de istoricul altor anunțuri.
  IF NEW.private_confirmed_at IS NOT NULL
     OR COALESCE(current_setting('app.admin_reactivate', true), 'off') = 'on' THEN
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
$function$;

CREATE OR REPLACE FUNCTION public.auto_blacklist_prospect(p_prospect_id uuid, p_score integer, p_reasons text[] DEFAULT '{}'::text[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_threshold int;
  v_enabled boolean;
  v_phone text;
  v_domain text;
  v_url text;
  v_already timestamptz;
  v_whitelisted boolean := false;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'forbidden: admin role required';
  END IF;

  SELECT suspicion_threshold, enabled
    INTO v_threshold, v_enabled
  FROM public.agency_detection_settings
  WHERE id = true
  LIMIT 1;

  IF v_threshold IS NULL THEN v_threshold := 70; END IF;
  IF v_enabled IS NULL THEN v_enabled := true; END IF;

  IF NOT v_enabled THEN
    RETURN jsonb_build_object('blacklisted', false, 'reason', 'engine_disabled', 'score', p_score, 'threshold', v_threshold);
  END IF;

  IF p_score < v_threshold THEN
    RETURN jsonb_build_object('blacklisted', false, 'reason', 'below_threshold', 'score', p_score, 'threshold', v_threshold);
  END IF;

  SELECT phone_normalized, source_url, auto_blacklisted_at
    INTO v_phone, v_url, v_already
  FROM public.prospect_listings
  WHERE id = p_prospect_id;

  IF v_already IS NOT NULL THEN
    RETURN jsonb_build_object('blacklisted', false, 'reason', 'already_blacklisted', 'score', p_score, 'threshold', v_threshold);
  END IF;

  v_domain := public.extract_url_domain(v_url);

  IF v_phone IS NOT NULL AND EXISTS (SELECT 1 FROM public.agency_whitelist WHERE phone_normalized = v_phone) THEN
    v_whitelisted := true;
  END IF;
  IF NOT v_whitelisted AND v_domain IS NOT NULL AND v_domain <> '' AND EXISTS (SELECT 1 FROM public.agency_whitelist WHERE domain = v_domain) THEN
    v_whitelisted := true;
  END IF;

  IF v_whitelisted THEN
    RETURN jsonb_build_object('blacklisted', false, 'reason', 'whitelisted', 'score', p_score, 'threshold', v_threshold);
  END IF;

  UPDATE public.prospect_listings
     SET prospect_type = 'agentie',
         is_active = false,
         auto_blacklisted_at = now(),
         auto_blacklist_reason = 'Auto-detected (High Suspicion)'
   WHERE id = p_prospect_id;

  IF v_phone IS NOT NULL THEN
    INSERT INTO public.agency_blocklist (phone_normalized, reason, notes, source_prospect_id)
    VALUES (v_phone, 'auto_high_suspicion', 'Auto-detected (High Suspicion). Score=' || p_score || ' / threshold=' || v_threshold, p_prospect_id)
    ON CONFLICT DO NOTHING;
  END IF;

  IF v_domain IS NOT NULL AND v_domain <> '' AND NOT public.is_classified_portal_domain(v_domain) THEN
    INSERT INTO public.agency_blocklist (domain, reason, notes, source_prospect_id)
    VALUES (v_domain, 'auto_high_suspicion', 'Auto-detected (High Suspicion). Score=' || p_score || ' / threshold=' || v_threshold, p_prospect_id)
    ON CONFLICT DO NOTHING;
  END IF;

  INSERT INTO public.admin_audit_log (action, actor_user_id, actor_label, entity_type, entity_id, details, severity)
  VALUES ('agency_auto_blacklist', auth.uid(), 'admin', 'prospect_listing', p_prospect_id::text,
    jsonb_build_object('score', p_score, 'threshold', v_threshold, 'phone', v_phone, 'domain', v_domain, 'reasons', to_jsonb(p_reasons)),
    'warning');

  RETURN jsonb_build_object('blacklisted', true, 'reason', 'auto_high_suspicion', 'score', p_score, 'threshold', v_threshold, 'phone', v_phone, 'domain', v_domain);
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_update_prospect_phone(p_id uuid, p_phone text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  p public.prospect_listings%ROWTYPE;
  v_phone text;
  v_old_phone text;
  v_wa int := 0;
  v_owner int := 0;
  v_calls int := 0;
  v_reactivate boolean := false;
  v_new_listed boolean := false;
  v_domain_listed boolean := false;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  v_phone := public.normalize_ro_phone(p_phone);
  IF v_phone IS NULL THEN
    RAISE EXCEPTION 'Scrie un număr românesc valid, de exemplu 0722 123 456 sau 0256 123 456' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO p FROM public.prospect_listings WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002'; END IF;

  v_old_phone := public.normalize_ro_phone(COALESCE(p.phone_normalized, p.contact_phone));
  IF v_old_phone = v_phone AND p.contact_phone = v_phone AND p.phone_normalized = v_phone THEN
    RETURN jsonb_build_object('ok', true, 'already', true, 'cancelled_wa', 0,
      'cancelled_owner_outreach', 0, 'cancelled_calls', 0, 'reactivated', false,
      'listing', public._prospect_triage_state(p_id));
  END IF;

  UPDATE public.wa_outbound_queue
  SET status = 'cancelled', last_error = 'phone_corrected_by_admin', updated_at = now()
  WHERE prospect_listing_id = p_id AND status = 'pending';
  GET DIAGNOSTICS v_wa = ROW_COUNT;

  UPDATE public.owner_outreach_messages
  SET status = 'cancelled', updated_at = now()
  WHERE prospect_listing_id = p_id AND status IN ('pending', 'auto_queued', 'draft');
  GET DIAGNOSTICS v_owner = ROW_COUNT;

  UPDATE public.voice_ghosting_queue SET status = 'cancelled'
  WHERE prospect_id = p_id AND status = 'pending';
  GET DIAGNOSTICS v_calls = ROW_COUNT;

  SELECT EXISTS (
    SELECT 1 FROM public.agency_blocklist b
    WHERE b.phone_normalized IS NOT NULL
      AND right(regexp_replace(b.phone_normalized, '\D', '', 'g'), 9) = right(v_phone, 9)
  ) INTO v_new_listed;

  SELECT EXISTS (
    SELECT 1 FROM public.agency_blocklist b
    WHERE b.domain IS NOT NULL AND b.domain = public._extract_domain(p.source_url)
  ) INTO v_domain_listed;

  -- Un mobil românesc valid, nelistat ca agenție, reactivează anunțul inactiv nerenunțat.
  v_domain_listed := v_domain_listed AND NOT public.is_classified_portal_domain(public._extract_domain(p.source_url));
  v_reactivate := p.is_active IS DISTINCT FROM true
    AND p.dismissed_at IS NULL
    AND v_phone ~ '^\+407[0-9]{8}$'
    AND NOT v_new_listed AND NOT v_domain_listed;

  PERFORM set_config('app.skip_auto_outreach', 'on', true);
  PERFORM set_config('app.admin_reactivate', CASE WHEN v_reactivate THEN 'on' ELSE 'off' END, true);

  UPDATE public.prospect_listings SET
    contact_phone = v_phone,
    phone_normalized = v_phone,
    phone_source = 'manual_admin',
    seller_type = CASE WHEN p.private_confirmed_at IS NOT NULL THEN 'privat'::text ELSE 'de_verificat'::text END,
    seller_type_reason = 'Telefon corectat manual — necesită reverificare',
    agency_classified_at = NULL,
    agency_suspicion_score = NULL,
    agency_suspicion_reason = NULL,
    prospect_type = CASE WHEN p.agency_marked_at IS NULL AND p.prospect_type = 'agentie' THEN NULL ELSE p.prospect_type END,
    outreach_status = CASE WHEN p.outreach_status IN ('blocked_agency', 'queued') THEN NULL ELSE p.outreach_status END,
    outreach_status_at = now(),
    outreach_scheduled_at = CASE WHEN p.outreach_status IN ('blocked_agency', 'queued') THEN NULL ELSE p.outreach_scheduled_at END,
    outreach_error = CASE WHEN p.outreach_status IN ('blocked_agency', 'queued') THEN NULL ELSE p.outreach_error END,
    andrei_queued_at = CASE WHEN v_wa > 0 AND COALESCE(p.outreach_status, '') IN ('', 'queued', 'blocked_agency') THEN NULL ELSE p.andrei_queued_at END,
    is_active = CASE WHEN v_reactivate THEN true ELSE p.is_active END,
    lifecycle_status = CASE WHEN v_reactivate THEN 'new'::lead_lifecycle_status ELSE p.lifecycle_status END,
    auto_blacklisted_at = CASE WHEN v_reactivate THEN NULL ELSE p.auto_blacklisted_at END,
    auto_blacklist_reason = CASE WHEN v_reactivate THEN NULL ELSE p.auto_blacklist_reason END,
    last_failure_reason = CASE WHEN v_reactivate THEN NULL ELSE p.last_failure_reason END
  WHERE id = p_id;

  PERFORM set_config('app.skip_auto_outreach', 'off', true);
  PERFORM set_config('app.admin_reactivate', 'off', true);

  INSERT INTO public.admin_audit_log (actor_user_id, action, entity_type, entity_id, details)
  VALUES (auth.uid(), 'prospect.phone_corrected', 'prospect_listing', p_id::text,
    jsonb_build_object('previous_phone', v_old_phone, 'new_phone', v_phone,
      'cancelled_wa', v_wa, 'cancelled_owner_outreach', v_owner,
      'cancelled_calls', v_calls, 'reactivated', v_reactivate));

  RETURN jsonb_build_object('ok', true, 'already', false,
    'cancelled_wa', v_wa, 'cancelled_owner_outreach', v_owner,
    'cancelled_calls', v_calls, 'reactivated', v_reactivate,
    'listing', public._prospect_triage_state(p_id));
END $function$;

CREATE OR REPLACE FUNCTION public.admin_confirm_prospect_private(p_id uuid, p_override_agency boolean DEFAULT false, p_auto_outreach boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  p public.prospect_listings%ROWTYPE;
  v_after public.prospect_listings%ROWTYPE;
  s public.prospect_listings%ROWTYPE;
  v_tail text;
  v_listed boolean := false;
  v_agency boolean;
  v_blocklist jsonb := '[]'::jsonb;
  v_siblings jsonb := '[]'::jsonb;
  v_affected jsonb := '[]'::jsonb;
  v_unblocked int := 0;
  v_reactivate boolean := false;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO p FROM public.prospect_listings WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002'; END IF;
  IF p.dismissed_at IS NOT NULL THEN
    RAISE EXCEPTION 'Anunțul e marcat indisponibil — readu-l întâi în listă' USING ERRCODE = 'P0001';
  END IF;

  v_tail := right(regexp_replace(COALESCE(p.phone_normalized, p.contact_phone, ''), '\D', '', 'g'), 9);
  IF length(v_tail) = 9 THEN
    v_listed := EXISTS (SELECT 1 FROM public.agency_blocklist b WHERE b.phone_normalized IS NOT NULL
       AND right(regexp_replace(b.phone_normalized, '\D', '', 'g'), 9) = v_tail);
  ELSE
    v_tail := NULL;
  END IF;

  IF p.seller_type = 'privat' AND p.agency_marked_at IS NULL AND NOT v_listed AND p.is_active IS NOT DISTINCT FROM true THEN
    RETURN jsonb_build_object('ok', true, 'already', true, 'listing', public._prospect_triage_state(p_id), 'affected', '[]'::jsonb);
  END IF;

  v_agency := public.prospect_is_agency(p) OR p.outreach_status = 'blocked_agency'
              OR p.agency_marked_at IS NOT NULL OR v_listed;
  IF v_agency AND NOT COALESCE(p_override_agency, false) THEN
    RAISE EXCEPTION 'Anunț marcat ca agenție — e nevoie de confirmarea separată' USING ERRCODE = 'P0001';
  END IF;
  IF p.outreach_status IS NOT NULL AND p.outreach_status <> 'blocked_agency' THEN
    RAISE EXCEPTION 'Proprietarul a fost deja contactat' USING ERRCODE = 'P0001';
  END IF;

  v_after := p;
  v_after.seller_type := 'privat';
  v_after.prospect_type := 'proprietar';
  v_after.agency_suspicion_score := 0;
  IF p.owner_sentiment = 'agentie' THEN v_after.owner_sentiment := NULL; END IF;
  IF public.prospect_is_agency(v_after) THEN
    RAISE EXCEPTION 'Titlul, numele sau etichetele conțin cuvinte de agenție — nu poate fi confirmat privat' USING ERRCODE = 'P0001';
  END IF;

  -- Confirmarea explicită reactivează orice anunț inactiv care nu a fost renunțat manual.
  v_reactivate := p.is_active IS DISTINCT FROM true;
  PERFORM set_config('app.admin_reactivate', 'on', true);

  IF v_tail IS NOT NULL THEN
    WITH d AS (
      DELETE FROM public.agency_blocklist b
      WHERE b.phone_normalized IS NOT NULL AND right(regexp_replace(b.phone_normalized, '\D', '', 'g'), 9) = v_tail
      RETURNING b.*
    ) SELECT COALESCE(jsonb_agg(to_jsonb(d)), '[]'::jsonb) INTO v_blocklist FROM d;
  END IF;

  IF NOT COALESCE(p_auto_outreach, false) THEN
    PERFORM set_config('app.skip_auto_outreach', 'on', true);
  END IF;

  UPDATE public.prospect_listings SET
    private_confirmed_at = now(),
    private_confirmed_by = auth.uid(),
    private_confirm_prev = jsonb_build_object(
      'seller_type', p.seller_type, 'seller_type_reason', p.seller_type_reason,
      'agency_classified_at', p.agency_classified_at, 'prospect_type', p.prospect_type,
      'outreach_status', p.outreach_status, 'outreach_status_at', p.outreach_status_at,
      'outreach_error', p.outreach_error,
      'agency_suspicion_score', p.agency_suspicion_score, 'owner_sentiment', p.owner_sentiment,
      'agency_marked_at', p.agency_marked_at, 'agency_marked_by', p.agency_marked_by,
      'agency_mark_prev', p.agency_mark_prev, 'agency_mark_root', p.agency_mark_root,
      'agency_mark_sibling_count', p.agency_mark_sibling_count,
      'is_active', p.is_active, 'lifecycle_status', p.lifecycle_status,
      'auto_blacklisted_at', p.auto_blacklisted_at, 'auto_blacklist_reason', p.auto_blacklist_reason,
      'last_failure_reason', p.last_failure_reason,
      'blocklist', v_blocklist),
    seller_type = 'privat',
    seller_type_reason = CASE WHEN v_agency THEN 'Confirmat manual de administrator (peste marcajul de agenție)'
                              ELSE 'Confirmat manual de administrator' END,
    agency_classified_at = COALESCE(p.agency_classified_at, now()),
    prospect_type = 'proprietar',
    agency_suspicion_score = 0,
    owner_sentiment = v_after.owner_sentiment,
    agency_marked_at = NULL, agency_marked_by = NULL, agency_mark_prev = NULL,
    agency_mark_root = NULL, agency_mark_sibling_count = 0,
    outreach_status = CASE WHEN p.outreach_status = 'blocked_agency' THEN NULL ELSE p.outreach_status END,
    outreach_error = CASE WHEN p.outreach_status = 'blocked_agency' THEN NULL ELSE p.outreach_error END,
    -- Anunțul inactiv nerenunțat redevine activ (fără apel sau mesaj automat).
    is_active = CASE WHEN v_reactivate THEN true ELSE p.is_active END,
    lifecycle_status = CASE WHEN v_reactivate THEN 'new'::lead_lifecycle_status ELSE p.lifecycle_status END,
    auto_blacklisted_at = CASE WHEN v_reactivate THEN NULL ELSE p.auto_blacklisted_at END,
    auto_blacklist_reason = CASE WHEN v_reactivate THEN NULL ELSE p.auto_blacklist_reason END,
    last_failure_reason = CASE WHEN v_reactivate THEN NULL ELSE p.last_failure_reason END
  WHERE id = p_id;

  IF v_tail IS NOT NULL THEN
    FOR s IN
      SELECT * FROM public.prospect_listings x
      WHERE x.id <> p_id AND x.dismissed_at IS NULL AND x.private_confirmed_at IS NULL
        AND right(regexp_replace(COALESCE(x.phone_normalized, x.contact_phone, ''), '\D', '', 'g'), 9) = v_tail
        AND (x.agency_mark_root IS NOT NULL
             OR (x.agency_marked_at IS NULL AND x.outreach_status = 'blocked_agency'))
      FOR UPDATE
    LOOP
      v_siblings := v_siblings || jsonb_build_array(jsonb_build_object(
        'id', s.id, 'seller_type', s.seller_type, 'seller_type_reason', s.seller_type_reason,
        'outreach_status', s.outreach_status, 'outreach_status_at', s.outreach_status_at,
        'outreach_error', s.outreach_error,
        'agency_marked_at', s.agency_marked_at, 'agency_marked_by', s.agency_marked_by,
        'agency_mark_prev', s.agency_mark_prev, 'agency_mark_root', s.agency_mark_root,
        'agency_mark_sibling_count', s.agency_mark_sibling_count));

      UPDATE public.prospect_listings SET
        agency_marked_at = NULL, agency_marked_by = NULL, agency_mark_prev = NULL,
        agency_mark_root = NULL, agency_mark_sibling_count = NULL,
        agency_classified_at = agency_classified_at
      WHERE id = s.id;

      UPDATE public.prospect_listings x SET
        outreach_status = NULL, outreach_status_at = now(), outreach_error = NULL
      WHERE x.id = s.id AND x.outreach_status = 'blocked_agency' AND NOT public.prospect_is_agency(x);
      IF FOUND THEN v_unblocked := v_unblocked + 1; END IF;

      v_affected := v_affected || jsonb_build_array(public._prospect_triage_state(s.id));
    END LOOP;

    UPDATE public.prospect_listings SET
      private_confirm_prev = private_confirm_prev || jsonb_build_object('siblings', v_siblings)
    WHERE id = p_id;
  END IF;

  PERFORM set_config('app.skip_auto_outreach', 'off', true);
  PERFORM set_config('app.admin_reactivate', 'off', true);

  INSERT INTO public.admin_audit_log (actor_user_id, action, entity_type, entity_id, details)
  VALUES (auth.uid(), 'prospect.confirm_private', 'prospect_listing', p_id::text,
          jsonb_build_object('previous_seller_type', p.seller_type, 'override_agency', v_agency,
                             'auto_outreach', COALESCE(p_auto_outreach, false), 'lead_score', p.lead_score,
                             'agency_mark_cleared', p.agency_marked_at IS NOT NULL,
                             'blocklist_removed', jsonb_array_length(v_blocklist),
                             'siblings_checked', jsonb_array_length(v_siblings),
                             'siblings_unblocked', v_unblocked, 'reactivated', v_reactivate));

  RETURN jsonb_build_object('ok', true, 'override_agency', v_agency,
    'blocklist_removed', jsonb_array_length(v_blocklist) > 0,
    'siblings_checked', jsonb_array_length(v_siblings), 'siblings_unblocked', v_unblocked,
    'reactivated', v_reactivate,
    'listing', public._prospect_triage_state(p_id), 'affected', v_affected);
END $function$;

CREATE OR REPLACE FUNCTION public.admin_reactivate_prospect(p_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  p public.prospect_listings%ROWTYPE;
  v_active boolean;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO p FROM public.prospect_listings WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002'; END IF;
  IF p.dismissed_at IS NOT NULL THEN
    RAISE EXCEPTION 'Anunțul e marcat indisponibil — folosește „Readu în listă”' USING ERRCODE = 'P0001';
  END IF;
  IF p.is_active IS NOT DISTINCT FROM true THEN
    RETURN jsonb_build_object('ok', true, 'already', true, 'listing', public._prospect_triage_state(p_id));
  END IF;
  PERFORM set_config('app.skip_auto_outreach', 'on', true);
  PERFORM set_config('app.admin_reactivate', 'on', true);
  UPDATE public.prospect_listings SET
    is_active = true, lifecycle_status = 'new'::lead_lifecycle_status,
    last_failure_reason = NULL, auto_blacklisted_at = NULL, auto_blacklist_reason = NULL
  WHERE id = p_id
  RETURNING is_active INTO v_active;
  PERFORM set_config('app.admin_reactivate', 'off', true);
  PERFORM set_config('app.skip_auto_outreach', 'off', true);
  IF v_active IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Numărul este în lista de agenții — confirmă-l ca privat sau scoate-l din listă' USING ERRCODE = 'P0001';
  END IF;
  INSERT INTO public.admin_audit_log (actor_user_id, action, entity_type, entity_id, details)
  VALUES (auth.uid(), 'prospect.reactivate', 'prospect_listing', p_id::text,
    jsonb_build_object('previous_lifecycle', p.lifecycle_status, 'previous_failure', p.last_failure_reason,
      'previous_blacklist_reason', p.auto_blacklist_reason));
  RETURN jsonb_build_object('ok', true, 'already', false, 'listing', public._prospect_triage_state(p_id));
END $$;
REVOKE ALL ON FUNCTION public.admin_reactivate_prospect(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_reactivate_prospect(uuid) TO authenticated, service_role;

SELECT set_config('app.skip_auto_outreach', 'on', true);
SELECT set_config('app.admin_reactivate', 'on', true);
UPDATE public.prospect_listings x SET
  is_active = true, lifecycle_status = 'new'::lead_lifecycle_status,
  last_failure_reason = NULL, auto_blacklisted_at = NULL, auto_blacklist_reason = NULL
WHERE x.dismissed_at IS NULL AND x.is_active IS DISTINCT FROM true
  AND public.is_classified_portal_domain(public._extract_domain(x.source_url))
  AND (x.last_failure_reason = 'agency_blocklist_domain'
       OR (x.auto_blacklist_reason = 'blocklist_auto_guard' AND x.last_failure_reason IS NULL))
  AND NOT EXISTS (SELECT 1 FROM public.agency_blocklist b WHERE b.phone_normalized IS NOT NULL
       AND x.phone_normalized IS NOT NULL AND b.phone_normalized = x.phone_normalized);
SELECT set_config('app.admin_reactivate', 'off', true);
SELECT set_config('app.skip_auto_outreach', 'off', true);