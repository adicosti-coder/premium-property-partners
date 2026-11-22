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

  -- Același număr (mobil 07… sau fix cu prefix real de județ): blocăm și celelalte anunțuri.
  -- Numerele incomplete sau extrase greșit din text (ex. date „2026…”) nu se propagă.
  v_digits := regexp_replace(COALESCE(p.phone_normalized, p.contact_phone, ''), '\D', '', 'g');
  IF v_digits ~ '^(40|0)(7[0-9]{8}|2[1-6][0-9]{7}|3[1-6][0-9]{7})$' THEN
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

REVOKE ALL ON FUNCTION public.admin_mark_prospect_agency(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_mark_prospect_agency(uuid) TO authenticated, service_role;