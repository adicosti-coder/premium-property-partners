-- Confirmarea manuală ca privat are prioritate: scoate numărul din lista de agenții,
-- ridică marcajul manual și deblochează anunțurile surori blocate doar din cauza numărului.

CREATE OR REPLACE FUNCTION public.classify_seller_type()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_phone text := NULLIF(regexp_replace(COALESCE(NEW.phone_normalized, NEW.contact_phone, ''), '\D', '', 'g'), '');
  v_tail text;
  v_count int := 0;
  v_signal text;
BEGIN
  -- Anularea unui marcaj manual readuce exact starea salvată, fără reclasificare.
  IF current_setting('app.restore_triage_state', true) = 'on' THEN
    RETURN NEW;
  END IF;
  -- Confirmarea manuală ca privat are prioritate absolută (marcarea ca agenție o șterge întâi).
  IF NEW.private_confirmed_at IS NOT NULL THEN
    NEW.seller_type := 'privat';
    NEW.seller_type_reason := COALESCE(NULLIF(NEW.seller_type_reason, ''), 'Confirmat manual de administrator');
    RETURN NEW;
  END IF;
  IF v_phone IS NOT NULL THEN
    v_tail := right(v_phone, 9);
    IF EXISTS (SELECT 1 FROM agency_blocklist b WHERE b.phone_normalized IS NOT NULL AND right(regexp_replace(b.phone_normalized,'\D','','g'),9) = v_tail) THEN
      NEW.seller_type := 'agentie'; NEW.seller_type_reason := 'Număr în lista locală de agenții'; RETURN NEW;
    END IF;
  END IF;
  IF NEW.agency_marked_at IS NOT NULL THEN
    NEW.seller_type := 'agentie';
    NEW.seller_type_reason := CASE WHEN NEW.agency_mark_root IS NOT NULL
      THEN 'Același număr ca un anunț marcat manual ca agenție'
      ELSE 'Marcat manual ca agenție de administrator' END;
    RETURN NEW;
  END IF;
  IF v_phone IS NOT NULL THEN
    SELECT count(DISTINCT p.id) INTO v_count FROM prospect_listings p
     WHERE p.id <> NEW.id AND p.duplicate_of IS NULL AND p.id IS DISTINCT FROM NEW.duplicate_of
       AND right(regexp_replace(COALESCE(p.phone_normalized,p.contact_phone,''),'\D','','g'),9) = v_tail
       AND COALESCE(p.dedup_key,'') <> COALESCE(NEW.dedup_key,'#');
    IF v_count >= 2 THEN
      NEW.seller_type := 'agentie'; NEW.seller_type_reason := format('Același număr apare în %s alte anunțuri diferite', v_count); RETURN NEW;
    END IF;
  END IF;
  IF COALESCE(NEW.agency_suspicion_score, 0) >= 50 THEN
    NEW.seller_type := 'agentie'; NEW.seller_type_reason := COALESCE(NEW.agency_suspicion_reason, 'Scor suspiciune agenție ridicat'); RETURN NEW;
  END IF;
  v_signal := public.developer_agency_signal(NEW.title, NEW.description);
  IF v_signal IS NOT NULL THEN
    NEW.seller_type := 'de_verificat';
    NEW.seller_type_reason := format('Needs Review: text de dezvoltator/agenție („%s”) — aprobă manual înainte de apel', v_signal);
    RETURN NEW;
  END IF;
  IF v_phone IS NOT NULL AND NEW.agency_classified_at IS NOT NULL AND NEW.agency_suspicion_score IS NOT NULL AND NEW.agency_suspicion_score < 25 THEN
    NEW.seller_type := 'privat'; NEW.seller_type_reason := 'Număr unic, fără semne de agenție'; RETURN NEW;
  END IF;
  IF NEW.agency_classified_at IS NOT NULL AND NEW.agency_suspicion_score IS NULL THEN
    NEW.seller_type := 'de_verificat';
    NEW.seller_type_reason := COALESCE(NEW.agency_suspicion_reason, 'Clasificare automată neconcludentă — verificare manuală');
    RETURN NEW;
  END IF;
  NEW.seller_type := 'de_verificat'; NEW.seller_type_reason := 'Date insuficiente pentru confirmare';
  RETURN NEW;
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

  IF p.seller_type = 'privat' AND p.agency_marked_at IS NULL AND NOT v_listed THEN
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

  v_reactivate := p.is_active IS DISTINCT FROM true
    AND (p.auto_blacklist_reason = 'blocklist_auto_guard' OR p.last_failure_reason = 'agency_blocklist_phone');

  -- Numărul iese din lista de agenții; rândurile șterse se păstrează pentru anulare.
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
    -- Anunțul dezactivat doar de lista de agenții redevine activ (fără apel sau mesaj automat).
    is_active = CASE WHEN v_reactivate THEN true ELSE p.is_active END,
    lifecycle_status = CASE WHEN v_reactivate AND p.lifecycle_status = 'expired' THEN 'new'::lead_lifecycle_status ELSE p.lifecycle_status END,
    auto_blacklisted_at = CASE WHEN v_reactivate THEN NULL ELSE p.auto_blacklisted_at END,
    auto_blacklist_reason = CASE WHEN v_reactivate THEN NULL ELSE p.auto_blacklist_reason END,
    last_failure_reason = CASE WHEN v_reactivate AND p.last_failure_reason = 'agency_blocklist_phone' THEN NULL ELSE p.last_failure_reason END
  WHERE id = p_id;

  -- Anunțurile surori blocate doar din cauza numărului se reclasifică; rămân agenție
  -- dacă au alte semne (ex. același număr pe multe anunțuri diferite). Marcajele manuale
  -- puse direct pe alt anunț rămân neatinse.
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

CREATE OR REPLACE FUNCTION public.admin_undo_confirm_prospect_private(p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  p public.prospect_listings%ROWTYPE;
  prev jsonb;
  sib jsonb;
  v_cancelled int := 0;
  v_affected jsonb := '[]'::jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO p FROM public.prospect_listings WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002'; END IF;
  IF p.private_confirmed_at IS NULL OR p.private_confirm_prev IS NULL THEN
    RETURN jsonb_build_object('ok', true, 'already', true, 'listing', public._prospect_triage_state(p_id), 'affected', '[]'::jsonb);
  END IF;
  prev := p.private_confirm_prev;
  IF (p.andrei_queued_at IS NOT NULL AND p.andrei_queued_at >= p.private_confirmed_at)
     OR (p.outreach_status IS NOT NULL AND p.outreach_status IS DISTINCT FROM NULLIF(prev->>'outreach_status', 'blocked_agency')) THEN
    RAISE EXCEPTION 'Proprietarul a fost deja contactat — confirmarea nu se mai poate anula' USING ERRCODE = 'P0001';
  END IF;

  WITH c AS (
    UPDATE public.wa_outbound_queue SET status = 'cancelled', last_error = 'private_confirm_undone', updated_at = now()
    WHERE prospect_listing_id = p_id AND status = 'pending' AND created_at >= p.private_confirmed_at RETURNING id
  ) SELECT count(*) INTO v_cancelled FROM c;

  -- Numărul revine în lista de agenții exact cum era.
  INSERT INTO public.agency_blocklist (id, phone_normalized, domain, reason, notes, source_prospect_id, created_by, created_at)
  SELECT b.id, b.phone_normalized, b.domain, b.reason, b.notes, b.source_prospect_id, b.created_by, b.created_at
  FROM jsonb_populate_recordset(NULL::public.agency_blocklist, COALESCE(prev->'blocklist', '[]'::jsonb)) b
  ON CONFLICT DO NOTHING;

  PERFORM set_config('app.skip_auto_outreach', 'on', true);
  PERFORM set_config('app.restore_triage_state', 'on', true);

  UPDATE public.prospect_listings SET
    private_confirmed_at = NULL, private_confirmed_by = NULL, private_confirm_prev = NULL,
    seller_type = prev->>'seller_type', seller_type_reason = prev->>'seller_type_reason',
    agency_classified_at = (prev->>'agency_classified_at')::timestamptz,
    agency_suspicion_score = (prev->>'agency_suspicion_score')::numeric,
    prospect_type = prev->>'prospect_type',
    owner_sentiment = prev->>'owner_sentiment',
    outreach_status = prev->>'outreach_status',
    outreach_status_at = CASE WHEN prev ? 'outreach_status_at' THEN (prev->>'outreach_status_at')::timestamptz ELSE outreach_status_at END,
    outreach_error = prev->>'outreach_error',
    agency_marked_at = CASE WHEN prev ? 'agency_marked_at' THEN (prev->>'agency_marked_at')::timestamptz ELSE agency_marked_at END,
    agency_marked_by = CASE WHEN prev ? 'agency_marked_by' THEN (prev->>'agency_marked_by')::uuid ELSE agency_marked_by END,
    agency_mark_prev = CASE WHEN prev ? 'agency_mark_prev' THEN
                         CASE WHEN jsonb_typeof(prev->'agency_mark_prev') = 'object' THEN prev->'agency_mark_prev' END
                       ELSE agency_mark_prev END,
    agency_mark_root = CASE WHEN prev ? 'agency_mark_root' THEN (prev->>'agency_mark_root')::uuid ELSE agency_mark_root END,
    agency_mark_sibling_count = CASE WHEN prev ? 'agency_mark_sibling_count' THEN (prev->>'agency_mark_sibling_count')::int ELSE agency_mark_sibling_count END,
    is_active = CASE WHEN prev ? 'is_active' THEN (prev->>'is_active')::boolean ELSE is_active END,
    lifecycle_status = CASE WHEN prev ? 'lifecycle_status' THEN (prev->>'lifecycle_status')::lead_lifecycle_status ELSE lifecycle_status END,
    auto_blacklisted_at = CASE WHEN prev ? 'auto_blacklisted_at' THEN (prev->>'auto_blacklisted_at')::timestamptz ELSE auto_blacklisted_at END,
    auto_blacklist_reason = CASE WHEN prev ? 'auto_blacklist_reason' THEN prev->>'auto_blacklist_reason' ELSE auto_blacklist_reason END,
    last_failure_reason = CASE WHEN prev ? 'last_failure_reason' THEN prev->>'last_failure_reason' ELSE last_failure_reason END
  WHERE id = p_id;

  FOR sib IN SELECT * FROM jsonb_array_elements(COALESCE(prev->'siblings', '[]'::jsonb)) LOOP
    UPDATE public.prospect_listings x SET
      seller_type = sib->>'seller_type', seller_type_reason = sib->>'seller_type_reason',
      outreach_status = sib->>'outreach_status',
      outreach_status_at = (sib->>'outreach_status_at')::timestamptz,
      outreach_error = sib->>'outreach_error',
      agency_marked_at = (sib->>'agency_marked_at')::timestamptz,
      agency_marked_by = (sib->>'agency_marked_by')::uuid,
      agency_mark_prev = CASE WHEN jsonb_typeof(sib->'agency_mark_prev') = 'object' THEN sib->'agency_mark_prev' END,
      agency_mark_root = (sib->>'agency_mark_root')::uuid,
      agency_mark_sibling_count = (sib->>'agency_mark_sibling_count')::int
    WHERE x.id = (sib->>'id')::uuid AND x.private_confirmed_at IS NULL AND x.dismissed_at IS NULL
      AND (x.outreach_status IS NULL OR x.outreach_status = 'blocked_agency');
    IF FOUND THEN
      v_affected := v_affected || jsonb_build_array(public._prospect_triage_state((sib->>'id')::uuid));
    END IF;
  END LOOP;

  PERFORM set_config('app.restore_triage_state', 'off', true);
  PERFORM set_config('app.skip_auto_outreach', 'off', true);

  INSERT INTO public.admin_audit_log (actor_user_id, action, entity_type, entity_id, details)
  VALUES (auth.uid(), 'prospect.confirm_private_undo', 'prospect_listing', p_id::text,
          jsonb_build_object('restored_seller_type', prev->>'seller_type', 'cancelled_wa', v_cancelled,
                             'blocklist_restored', jsonb_array_length(COALESCE(prev->'blocklist', '[]'::jsonb)),
                             'siblings_restored', jsonb_array_length(v_affected)));

  RETURN jsonb_build_object('ok', true, 'listing', public._prospect_triage_state(p_id), 'affected', v_affected);
END $function$;

REVOKE ALL ON FUNCTION public.admin_confirm_prospect_private(uuid, boolean, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_confirm_prospect_private(uuid, boolean, boolean) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.admin_undo_confirm_prospect_private(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_undo_confirm_prospect_private(uuid) TO authenticated, service_role;

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

  -- Confirmarea manuală ca privat nu e anulată de istoricul altor anunțuri cu același număr.
  IF NEW.private_confirmed_at IS NOT NULL THEN
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