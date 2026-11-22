ALTER TABLE public.prospect_listings
  ADD COLUMN IF NOT EXISTS agency_mark_root uuid,
  ADD COLUMN IF NOT EXISTS agency_mark_sibling_count integer;

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
    NEW.seller_type_reason := CASE WHEN NEW.agency_mark_root IS NOT NULL
      THEN 'Același număr ca un anunț marcat manual ca agenție'
      ELSE 'Marcat manual ca agenție de administrator' END;
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
    'private_confirmed_at', private_confirmed_at, 'agency_marked_at', agency_marked_at,
    'agency_mark_root', agency_mark_root, 'agency_mark_sibling_count', agency_mark_sibling_count)
  FROM public.prospect_listings WHERE id = p_id
$function$;
REVOKE ALL ON FUNCTION public._prospect_triage_state(uuid) FROM PUBLIC, anon, authenticated;

-- Marchează un singur anunț (fără verificare de rol: apelat doar din RPC-urile admin).
CREATE OR REPLACE FUNCTION public._prospect_agency_mark_row(p_id uuid, p_actor uuid, p_root uuid)
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
  SELECT * INTO p FROM public.prospect_listings WHERE id = p_id FOR UPDATE;
  IF NOT FOUND OR p.agency_marked_at IS NOT NULL OR p.dismissed_at IS NOT NULL THEN RETURN NULL; END IF;

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
    agency_marked_by = p_actor,
    agency_mark_root = p_root,
    agency_mark_sibling_count = NULL,
    agency_mark_prev = jsonb_build_object(
      'seller_type', p.seller_type, 'seller_type_reason', p.seller_type_reason,
      'agency_classified_at', p.agency_classified_at,
      'outreach_status', p.outreach_status, 'outreach_status_at', p.outreach_status_at,
      'outreach_scheduled_at', p.outreach_scheduled_at, 'outreach_error', p.outreach_error,
      'private_confirmed_at', p.private_confirmed_at, 'private_confirmed_by', p.private_confirmed_by,
      'private_confirm_prev', p.private_confirm_prev, 'group_root', p_root,
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

  RETURN jsonb_build_object('wa', cardinality(v_wa), 'owner_outreach', jsonb_array_length(v_oom),
    'calls', cardinality(v_ghost), 'previous_seller_type', p.seller_type, 'previous_outreach_status', p.outreach_status);
END $function$;

-- Readuce un singur anunț la starea dinaintea marcajului; întoarce câte mesaje WhatsApp au revenit în coadă.
CREATE OR REPLACE FUNCTION public._prospect_agency_unmark_row(p_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  p public.prospect_listings%ROWTYPE;
  v_prev jsonb;
  v_restored_wa int := 0;
BEGIN
  SELECT * INTO p FROM public.prospect_listings WHERE id = p_id FOR UPDATE;
  IF NOT FOUND OR p.agency_marked_at IS NULL OR p.agency_mark_prev IS NULL THEN RETURN 0; END IF;
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
    agency_mark_root = NULL, agency_mark_sibling_count = NULL,
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
  RETURN v_restored_wa;
END $function$;

REVOKE ALL ON FUNCTION public._prospect_agency_mark_row(uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._prospect_agency_unmark_row(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_mark_prospect_agency(p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  p public.prospect_listings%ROWTYPE;
  r jsonb;
  rs jsonb;
  v_digits text;
  v_tail text;
  v_phone text;
  v_sib uuid;
  v_sib_ids uuid[] := '{}';
  v_sib_cancelled int := 0;
  v_skipped_private int := 0;
  v_already_listed boolean := false;
  v_block_id uuid;
  v_affected jsonb := '[]'::jsonb;
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

  r := public._prospect_agency_mark_row(p_id, auth.uid(), NULL);

  -- Același număr (ultimele 9 cifre ale unui număr complet): blocăm și celelalte anunțuri.
  v_digits := regexp_replace(COALESCE(p.phone_normalized, p.contact_phone, ''), '\D', '', 'g');
  IF length(v_digits) >= 11 THEN
    v_tail := right(v_digits, 9);
    v_phone := COALESCE(p.phone_normalized, public.normalize_ro_phone(p.contact_phone));

    -- Confirmările explicite „privat” nu se suprascriu fără confirmare separată.
    SELECT count(*) INTO v_skipped_private FROM public.prospect_listings s
     WHERE s.id <> p_id AND s.dismissed_at IS NULL AND s.agency_marked_at IS NULL
       AND s.private_confirmed_at IS NOT NULL
       AND right(regexp_replace(COALESCE(s.phone_normalized, s.contact_phone, ''), '\D', '', 'g'), 9) = v_tail;

    FOR v_sib IN
      SELECT s.id FROM public.prospect_listings s
       WHERE s.id <> p_id AND s.dismissed_at IS NULL AND s.agency_marked_at IS NULL
         AND s.private_confirmed_at IS NULL
         AND (s.is_active IS TRUE OR s.seller_type IS DISTINCT FROM 'privat')
         AND right(regexp_replace(COALESCE(s.phone_normalized, s.contact_phone, ''), '\D', '', 'g'), 9) = v_tail
       ORDER BY s.id
    LOOP
      rs := public._prospect_agency_mark_row(v_sib, auth.uid(), p_id);
      IF rs IS NOT NULL THEN
        v_sib_ids := v_sib_ids || v_sib;
        v_sib_cancelled := v_sib_cancelled + (rs->>'wa')::int + (rs->>'owner_outreach')::int + (rs->>'calls')::int;
        INSERT INTO public.admin_audit_log (actor_user_id, action, entity_type, entity_id, details)
        VALUES (auth.uid(), 'prospect.mark_agency_by_phone', 'prospect_listing', v_sib::text,
                jsonb_build_object('root_listing', p_id, 'previous_seller_type', rs->>'previous_seller_type',
                                   'previous_outreach_status', rs->>'previous_outreach_status',
                                   'cancelled_wa', (rs->>'wa')::int, 'cancelled_owner_outreach', (rs->>'owner_outreach')::int,
                                   'cancelled_calls', (rs->>'calls')::int));
        v_affected := v_affected || jsonb_build_array(public._prospect_triage_state(v_sib));
      END IF;
    END LOOP;

    v_already_listed := EXISTS (SELECT 1 FROM public.agency_blocklist b WHERE b.phone_normalized IS NOT NULL
      AND right(regexp_replace(b.phone_normalized, '\D', '', 'g'), 9) = v_tail);
    IF NOT v_already_listed AND v_skipped_private = 0 AND v_phone IS NOT NULL THEN
      INSERT INTO public.agency_blocklist (phone_normalized, reason, notes, source_prospect_id, created_by)
      VALUES (v_phone, 'manual_mark_agency', 'Adăugat din Triere la marcarea manuală ca agenție', p_id, auth.uid())
      ON CONFLICT DO NOTHING
      RETURNING id INTO v_block_id;
    END IF;
  END IF;

  UPDATE public.prospect_listings SET
    agency_mark_sibling_count = cardinality(v_sib_ids),
    agency_mark_prev = agency_mark_prev || jsonb_build_object('sibling_ids', to_jsonb(v_sib_ids), 'blocklist_id', v_block_id)
  WHERE id = p_id;
  PERFORM set_config('app.skip_auto_outreach', 'off', true);

  INSERT INTO public.admin_audit_log (actor_user_id, action, entity_type, entity_id, details)
  VALUES (auth.uid(), 'prospect.mark_agency', 'prospect_listing', p_id::text,
          jsonb_build_object('previous_seller_type', r->>'previous_seller_type', 'previous_outreach_status', r->>'previous_outreach_status',
                             'cancelled_wa', (r->>'wa')::int, 'cancelled_owner_outreach', (r->>'owner_outreach')::int,
                             'cancelled_calls', (r->>'calls')::int,
                             'siblings_marked', cardinality(v_sib_ids), 'sibling_ids', to_jsonb(v_sib_ids),
                             'siblings_cancelled', v_sib_cancelled, 'skipped_private', v_skipped_private,
                             'blocklist_added', v_block_id IS NOT NULL, 'already_listed', v_already_listed));

  RETURN jsonb_build_object('ok', true,
    'cancelled_wa', (r->>'wa')::int, 'cancelled_owner_outreach', (r->>'owner_outreach')::int, 'cancelled_calls', (r->>'calls')::int,
    'siblings_marked', cardinality(v_sib_ids), 'siblings_cancelled', v_sib_cancelled,
    'skipped_private', v_skipped_private, 'blocklist_added', v_block_id IS NOT NULL, 'already_listed', v_already_listed,
    'listing', public._prospect_triage_state(p_id), 'affected', v_affected);
END $function$;

-- Anularea e unitară: din orice anunț al grupului readuce anunțul marcat, pe cele blocate pe același număr
-- și scoate numărul din lista de agenții doar dacă a fost adăugat de acest marcaj.
CREATE OR REPLACE FUNCTION public.admin_undo_mark_prospect_agency(p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  p public.prospect_listings%ROWTYPE;
  v_root uuid;
  v_root_prev jsonb;
  v_root_marked boolean;
  v_restored_wa int := 0;
  v_sib uuid;
  v_sib_ids uuid[] := '{}';
  v_block_removed boolean := false;
  v_affected jsonb := '[]'::jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO p FROM public.prospect_listings WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002'; END IF;
  IF p.agency_marked_at IS NULL OR p.agency_mark_prev IS NULL THEN
    RETURN jsonb_build_object('ok', true, 'already', true, 'listing', public._prospect_triage_state(p_id));
  END IF;

  v_root := COALESCE(p.agency_mark_root, p_id);
  SELECT agency_mark_prev, agency_marked_at IS NOT NULL INTO v_root_prev, v_root_marked
    FROM public.prospect_listings WHERE id = v_root FOR UPDATE;

  IF v_root <> p_id AND NOT COALESCE(v_root_marked, false) THEN
    -- Anunțul principal nu mai e marcat: readucem doar acest anunț.
    v_restored_wa := public._prospect_agency_unmark_row(p_id);
    v_affected := jsonb_build_array(public._prospect_triage_state(p_id));
  ELSE
    IF v_root_prev->>'blocklist_id' IS NOT NULL THEN
      DELETE FROM public.agency_blocklist
       WHERE id = (v_root_prev->>'blocklist_id')::uuid AND source_prospect_id = v_root AND reason = 'manual_mark_agency';
      v_block_removed := FOUND;
    END IF;
    FOR v_sib IN
      SELECT id FROM public.prospect_listings WHERE agency_mark_root = v_root AND agency_marked_at IS NOT NULL ORDER BY id
    LOOP
      v_restored_wa := v_restored_wa + public._prospect_agency_unmark_row(v_sib);
      v_sib_ids := v_sib_ids || v_sib;
      v_affected := v_affected || jsonb_build_array(public._prospect_triage_state(v_sib));
    END LOOP;
    v_restored_wa := v_restored_wa + public._prospect_agency_unmark_row(v_root);
    v_affected := v_affected || jsonb_build_array(public._prospect_triage_state(v_root));
  END IF;
  PERFORM set_config('app.skip_auto_outreach', 'off', true);

  INSERT INTO public.admin_audit_log (actor_user_id, action, entity_type, entity_id, details)
  VALUES (auth.uid(), 'prospect.mark_agency_undo', 'prospect_listing', v_root::text,
          jsonb_build_object('restored_wa', v_restored_wa, 'requested_from', p_id,
                             'siblings_restored', cardinality(v_sib_ids), 'sibling_ids', to_jsonb(v_sib_ids),
                             'blocklist_removed', v_block_removed));

  RETURN jsonb_build_object('ok', true, 'restored_wa', v_restored_wa,
    'siblings_restored', cardinality(v_sib_ids), 'blocklist_removed', v_block_removed,
    'listing', public._prospect_triage_state(p_id), 'affected', v_affected);
END $function$;

REVOKE ALL ON FUNCTION public.admin_mark_prospect_agency(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_undo_mark_prospect_agency(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_mark_prospect_agency(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_undo_mark_prospect_agency(uuid) TO authenticated, service_role;