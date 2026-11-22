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
  IF p.agency_marked_at IS NOT NULL THEN
    RAISE EXCEPTION 'Anunț marcat manual ca agenție — anulează întâi marcajul' USING ERRCODE = 'P0001';
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