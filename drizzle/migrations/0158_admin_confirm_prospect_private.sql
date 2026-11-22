ALTER TABLE public.prospect_listings
  ADD COLUMN IF NOT EXISTS private_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS private_confirmed_by uuid,
  ADD COLUMN IF NOT EXISTS private_confirm_prev jsonb;

-- Clasificarea automată păstrează confirmarea manuală (lista de agenții rămâne prioritară).
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
  IF v_phone IS NOT NULL THEN
    v_tail := right(v_phone, 9);
    IF EXISTS (SELECT 1 FROM agency_blocklist b WHERE b.phone_normalized IS NOT NULL AND right(regexp_replace(b.phone_normalized,'\D','','g'),9) = v_tail) THEN
      NEW.seller_type := 'agentie'; NEW.seller_type_reason := 'Număr în lista locală de agenții'; RETURN NEW;
    END IF;
  END IF;
  IF NEW.private_confirmed_at IS NOT NULL THEN
    NEW.seller_type := 'privat';
    NEW.seller_type_reason := COALESCE(NULLIF(NEW.seller_type_reason, ''), 'Confirmat manual de administrator');
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

-- Primul mesaj automat poate fi oprit pentru o singură tranzacție (confirmare din Triere).
CREATE OR REPLACE FUNCTION public.fire_make_outreach()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE secret text; v_phone text; v_manual boolean := false;
BEGIN
  IF COALESCE(current_setting('app.skip_auto_outreach', true), '') = 'on' THEN RETURN NEW; END IF;
  IF NEW.outreach_status IS NOT NULL THEN RETURN NEW; END IF;
  IF public.prospect_is_agency(NEW) THEN RETURN NEW; END IF;
  IF COALESCE(NEW.seller_type, '') <> 'privat' OR COALESCE(NEW.lead_score, 0) <= 60 THEN RETURN NEW; END IF;
  IF COALESCE(NEW.expiry_check_status, '') IN ('inactiv_sursa', 'expired') THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' THEN
    v_manual := OLD.seller_type IS DISTINCT FROM NEW.seller_type;
    IF NOT v_manual THEN
      IF COALESCE(OLD.lead_score, 0) > 60 THEN RETURN NEW; END IF;
      IF NEW.created_at < now() - interval '7 days' THEN RETURN NEW; END IF;
    END IF;
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

CREATE OR REPLACE FUNCTION public._prospect_triage_state(p_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_object(
    'id', id, 'seller_type', seller_type, 'prospect_type', prospect_type, 'outreach_status', outreach_status,
    'agency_suspicion_score', agency_suspicion_score, 'owner_sentiment', owner_sentiment, 'lead_score', lead_score,
    'lifecycle_status', lifecycle_status, 'tags', to_jsonb(tags), 'andrei_queued_at', andrei_queued_at,
    'private_confirmed_at', private_confirmed_at)
  FROM public.prospect_listings WHERE id = p_id
$function$;
REVOKE ALL ON FUNCTION public._prospect_triage_state(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_confirm_prospect_private(
  p_id uuid, p_override_agency boolean DEFAULT false, p_auto_outreach boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  p public.prospect_listings%ROWTYPE;
  v_after public.prospect_listings%ROWTYPE;
  v_tail text;
  v_agency boolean;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO p FROM public.prospect_listings WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002'; END IF;
  IF p.dismissed_at IS NOT NULL THEN
    RAISE EXCEPTION 'Anunțul e marcat indisponibil — readu-l întâi în listă' USING ERRCODE = 'P0001';
  END IF;
  IF p.seller_type = 'privat' THEN
    RETURN jsonb_build_object('ok', true, 'already', true, 'listing', public._prospect_triage_state(p_id));
  END IF;

  v_tail := right(regexp_replace(COALESCE(p.phone_normalized, p.contact_phone, ''), '\D', '', 'g'), 9);
  IF length(v_tail) = 9 AND EXISTS (SELECT 1 FROM public.agency_blocklist b WHERE b.phone_normalized IS NOT NULL
       AND right(regexp_replace(b.phone_normalized, '\D', '', 'g'), 9) = v_tail) THEN
    RAISE EXCEPTION 'Numărul este în lista de agenții — scoate-l întâi din listă' USING ERRCODE = 'P0001';
  END IF;

  v_agency := public.prospect_is_agency(p) OR p.outreach_status = 'blocked_agency';
  IF v_agency AND NOT COALESCE(p_override_agency, false) THEN
    RAISE EXCEPTION 'Anunț marcat ca agenție — e nevoie de confirmarea separată' USING ERRCODE = 'P0001';
  END IF;
  IF p.outreach_status IS NOT NULL AND p.outreach_status <> 'blocked_agency' THEN
    RAISE EXCEPTION 'Proprietarul a fost deja contactat' USING ERRCODE = 'P0001';
  END IF;

  v_after := p;
  v_after.seller_type := 'privat';
  v_after.prospect_type := 'proprietar';
  IF v_agency THEN
    v_after.agency_suspicion_score := 0;
    IF p.owner_sentiment = 'agentie' THEN v_after.owner_sentiment := NULL; END IF;
  END IF;
  IF public.prospect_is_agency(v_after) THEN
    RAISE EXCEPTION 'Titlul, numele sau etichetele conțin cuvinte de agenție — nu poate fi confirmat privat' USING ERRCODE = 'P0001';
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
      'outreach_status', p.outreach_status, 'outreach_error', p.outreach_error,
      'agency_suspicion_score', p.agency_suspicion_score, 'owner_sentiment', p.owner_sentiment),
    seller_type = 'privat',
    seller_type_reason = CASE WHEN v_agency THEN 'Confirmat manual de administrator (peste marcajul de agenție)'
                              ELSE 'Confirmat manual de administrator' END,
    agency_classified_at = COALESCE(p.agency_classified_at, now()),
    prospect_type = 'proprietar',
    agency_suspicion_score = v_after.agency_suspicion_score,
    owner_sentiment = v_after.owner_sentiment,
    outreach_status = CASE WHEN p.outreach_status = 'blocked_agency' THEN NULL ELSE p.outreach_status END,
    outreach_error = CASE WHEN p.outreach_status = 'blocked_agency' THEN NULL ELSE p.outreach_error END
  WHERE id = p_id;

  PERFORM set_config('app.skip_auto_outreach', 'off', true);

  INSERT INTO public.admin_audit_log (actor_user_id, action, entity_type, entity_id, details)
  VALUES (auth.uid(), 'prospect.confirm_private', 'prospect_listing', p_id::text,
          jsonb_build_object('previous_seller_type', p.seller_type, 'override_agency', v_agency,
                             'auto_outreach', COALESCE(p_auto_outreach, false), 'lead_score', p.lead_score));

  RETURN jsonb_build_object('ok', true, 'override_agency', v_agency, 'listing', public._prospect_triage_state(p_id));
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
  v_cancelled int := 0;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO p FROM public.prospect_listings WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002'; END IF;
  IF p.private_confirmed_at IS NULL OR p.private_confirm_prev IS NULL THEN
    RETURN jsonb_build_object('ok', true, 'already', true, 'listing', public._prospect_triage_state(p_id));
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

  PERFORM set_config('app.skip_auto_outreach', 'on', true);

  UPDATE public.prospect_listings SET
    private_confirmed_at = NULL, private_confirmed_by = NULL, private_confirm_prev = NULL,
    agency_classified_at = (prev->>'agency_classified_at')::timestamptz,
    agency_suspicion_score = (prev->>'agency_suspicion_score')::numeric,
    prospect_type = prev->>'prospect_type',
    owner_sentiment = prev->>'owner_sentiment',
    outreach_status = prev->>'outreach_status',
    outreach_error = prev->>'outreach_error'
  WHERE id = p_id;

  -- Separat, ca reclasificarea automată să nu înlocuiască valoarea anterioară exactă.
  UPDATE public.prospect_listings SET
    seller_type = prev->>'seller_type', seller_type_reason = prev->>'seller_type_reason'
  WHERE id = p_id;

  PERFORM set_config('app.skip_auto_outreach', 'off', true);

  INSERT INTO public.admin_audit_log (actor_user_id, action, entity_type, entity_id, details)
  VALUES (auth.uid(), 'prospect.confirm_private_undo', 'prospect_listing', p_id::text,
          jsonb_build_object('restored_seller_type', prev->>'seller_type', 'cancelled_wa', v_cancelled));

  RETURN jsonb_build_object('ok', true, 'listing', public._prospect_triage_state(p_id));
END $function$;

REVOKE ALL ON FUNCTION public.admin_confirm_prospect_private(uuid, boolean, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_undo_confirm_prospect_private(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_confirm_prospect_private(uuid, boolean, boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_undo_confirm_prospect_private(uuid) TO authenticated, service_role;