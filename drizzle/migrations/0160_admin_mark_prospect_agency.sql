ALTER TABLE public.prospect_listings
  ADD COLUMN IF NOT EXISTS agency_marked_at timestamptz,
  ADD COLUMN IF NOT EXISTS agency_marked_by uuid,
  ADD COLUMN IF NOT EXISTS agency_mark_prev jsonb;

-- Marcajul manual de agenție are prioritate după lista de agenții (reclasificarea nu îl ridică).
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
  IF NEW.agency_marked_at IS NOT NULL THEN
    NEW.seller_type := 'agentie';
    NEW.seller_type_reason := 'Marcat manual ca agenție de administrator';
    RETURN NEW;
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
    'private_confirmed_at', private_confirmed_at, 'agency_marked_at', agency_marked_at)
  FROM public.prospect_listings WHERE id = p_id
$function$;
REVOKE ALL ON FUNCTION public._prospect_triage_state(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_mark_prospect_agency(p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  p public.prospect_listings%ROWTYPE;
  v_wa uuid[];
  v_oom jsonb;
  v_ghost uuid[];
  v_block boolean;
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
    RETURN jsonb_build_object('ok', true, 'already', true, 'listing', public._prospect_triage_state(p_id));
  END IF;

  WITH c AS (
    UPDATE public.wa_outbound_queue SET status = 'cancelled', last_error = 'agency_marked_by_admin', updated_at = now()
    WHERE prospect_listing_id = p_id AND status = 'pending' RETURNING id
  ) SELECT COALESCE(array_agg(id), '{}') INTO v_wa FROM c;

  WITH c AS (
    UPDATE public.owner_outreach_messages o SET status = 'cancelled', updated_at = now()
    FROM (SELECT id, status AS old_status FROM public.owner_outreach_messages
          WHERE prospect_listing_id = p_id AND status IN ('pending', 'auto_queued', 'draft') FOR UPDATE) prev
    WHERE o.id = prev.id RETURNING o.id, prev.old_status
  ) SELECT COALESCE(jsonb_agg(jsonb_build_object('id', id, 'status', old_status)), '[]'::jsonb) INTO v_oom FROM c;

  WITH c AS (
    UPDATE public.voice_ghosting_queue SET status = 'cancelled'
    WHERE prospect_id = p_id AND status = 'pending' RETURNING id
  ) SELECT COALESCE(array_agg(id), '{}') INTO v_ghost FROM c;

  -- Mesajele deja trimise rămân în istoric; doar coada neplecată devine blocked_agency.
  v_block := p.outreach_status IS NULL OR p.outreach_status IN ('queued', 'skipped', 'blocked_agency');

  PERFORM set_config('app.skip_auto_outreach', 'on', true);
  UPDATE public.prospect_listings SET
    agency_marked_at = now(),
    agency_marked_by = auth.uid(),
    agency_mark_prev = jsonb_build_object(
      'seller_type', p.seller_type, 'seller_type_reason', p.seller_type_reason,
      'agency_classified_at', p.agency_classified_at,
      'outreach_status', p.outreach_status, 'outreach_status_at', p.outreach_status_at,
      'outreach_scheduled_at', p.outreach_scheduled_at, 'outreach_error', p.outreach_error,
      'private_confirmed_at', p.private_confirmed_at, 'private_confirmed_by', p.private_confirmed_by,
      'private_confirm_prev', p.private_confirm_prev,
      'wa_queue_ids', to_jsonb(v_wa), 'owner_outreach', v_oom, 'ghost_ids', to_jsonb(v_ghost)),
    seller_type = 'agentie',
    seller_type_reason = 'Marcat manual ca agenție de administrator',
    agency_classified_at = COALESCE(p.agency_classified_at, now()),
    private_confirmed_at = NULL, private_confirmed_by = NULL, private_confirm_prev = NULL,
    outreach_status = CASE WHEN v_block THEN 'blocked_agency' ELSE p.outreach_status END,
    outreach_status_at = CASE WHEN v_block THEN now() ELSE p.outreach_status_at END,
    outreach_scheduled_at = NULL,
    outreach_error = CASE WHEN v_block THEN 'agentie' ELSE p.outreach_error END
  WHERE id = p_id;
  PERFORM set_config('app.skip_auto_outreach', 'off', true);

  INSERT INTO public.admin_audit_log (actor_user_id, action, entity_type, entity_id, details)
  VALUES (auth.uid(), 'prospect.mark_agency', 'prospect_listing', p_id::text,
          jsonb_build_object('previous_seller_type', p.seller_type, 'previous_outreach_status', p.outreach_status,
                             'cancelled_wa', cardinality(v_wa), 'cancelled_owner_outreach', jsonb_array_length(v_oom),
                             'cancelled_calls', cardinality(v_ghost)));

  RETURN jsonb_build_object('ok', true, 'cancelled_wa', cardinality(v_wa),
    'cancelled_owner_outreach', jsonb_array_length(v_oom), 'cancelled_calls', cardinality(v_ghost),
    'listing', public._prospect_triage_state(p_id));
END $function$;

CREATE OR REPLACE FUNCTION public.admin_undo_mark_prospect_agency(p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  p public.prospect_listings%ROWTYPE;
  v_prev jsonb;
  v_restored_wa int := 0;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO p FROM public.prospect_listings WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002'; END IF;
  IF p.agency_marked_at IS NULL OR p.agency_mark_prev IS NULL THEN
    RETURN jsonb_build_object('ok', true, 'already', true, 'listing', public._prospect_triage_state(p_id));
  END IF;
  v_prev := p.agency_mark_prev;

  UPDATE public.wa_outbound_queue SET status = 'pending', last_error = NULL, updated_at = now()
  WHERE prospect_listing_id = p_id AND status = 'cancelled' AND last_error = 'agency_marked_by_admin'
    AND id::text IN (SELECT jsonb_array_elements_text(COALESCE(v_prev->'wa_queue_ids', '[]'::jsonb)));
  GET DIAGNOSTICS v_restored_wa = ROW_COUNT;

  UPDATE public.owner_outreach_messages o SET status = x.status, updated_at = now()
  FROM jsonb_to_recordset(COALESCE(v_prev->'owner_outreach', '[]'::jsonb)) AS x(id uuid, status text)
  WHERE o.id = x.id AND o.status = 'cancelled';

  UPDATE public.voice_ghosting_queue SET status = 'pending'
  WHERE prospect_id = p_id AND status = 'cancelled'
    AND id::text IN (SELECT jsonb_array_elements_text(COALESCE(v_prev->'ghost_ids', '[]'::jsonb)));

  -- Anularea nu declanșează primul mesaj automat; trimiterea rămâne acțiune explicită.
  PERFORM set_config('app.skip_auto_outreach', 'on', true);
  UPDATE public.prospect_listings SET
    agency_marked_at = NULL, agency_marked_by = NULL, agency_mark_prev = NULL,
    private_confirmed_at = (v_prev->>'private_confirmed_at')::timestamptz,
    private_confirmed_by = (v_prev->>'private_confirmed_by')::uuid,
    private_confirm_prev = CASE WHEN jsonb_typeof(v_prev->'private_confirm_prev') = 'object' THEN v_prev->'private_confirm_prev' END,
    agency_classified_at = (v_prev->>'agency_classified_at')::timestamptz,
    seller_type = v_prev->>'seller_type',
    seller_type_reason = v_prev->>'seller_type_reason',
    outreach_status = v_prev->>'outreach_status',
    outreach_status_at = (v_prev->>'outreach_status_at')::timestamptz,
    outreach_scheduled_at = (v_prev->>'outreach_scheduled_at')::timestamptz,
    outreach_error = v_prev->>'outreach_error'
  WHERE id = p_id;
  PERFORM set_config('app.skip_auto_outreach', 'off', true);

  INSERT INTO public.admin_audit_log (actor_user_id, action, entity_type, entity_id, details)
  VALUES (auth.uid(), 'prospect.mark_agency_undo', 'prospect_listing', p_id::text,
          jsonb_build_object('restored_wa', v_restored_wa));

  RETURN jsonb_build_object('ok', true, 'restored_wa', v_restored_wa, 'listing', public._prospect_triage_state(p_id));
END $function$;

REVOKE ALL ON FUNCTION public.admin_mark_prospect_agency(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_undo_mark_prospect_agency(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_mark_prospect_agency(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_undo_mark_prospect_agency(uuid) TO authenticated, service_role;