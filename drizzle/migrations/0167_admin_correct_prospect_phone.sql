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
    'agency_mark_root', agency_mark_root, 'agency_mark_sibling_count', agency_mark_sibling_count,
    'contact_phone', contact_phone, 'phone_normalized', phone_normalized, 'phone_source', phone_source,
    'is_active', is_active)
  FROM public.prospect_listings WHERE id = p_id
$function$;

REVOKE ALL ON FUNCTION public._prospect_triage_state(uuid) FROM PUBLIC, anon, authenticated;

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

  -- Orice trimitere încă neefectuată către vechiul număr se oprește. Nu o mutăm
  -- automat pe noul număr: administratorul verifică și pornește explicit contactarea.
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

  -- Reactivează numai o dezactivare cauzată explicit de vechiul telefon blocat,
  -- niciodată una de portal, de domeniu sau o renunțare manuală.
  v_reactivate := p.is_active IS DISTINCT FROM true
    AND p.dismissed_at IS NULL
    AND p.last_failure_reason = 'agency_blocklist_phone'
    AND NOT v_new_listed AND NOT v_domain_listed;

  PERFORM set_config('app.skip_auto_outreach', 'on', true);

  UPDATE public.prospect_listings SET
    contact_phone = v_phone,
    phone_normalized = v_phone,
    phone_source = 'manual_admin',
    -- Telefonul nou este o identitate nouă de verificat. O confirmare privată
    -- explicită rămâne valabilă; marcajele manuale de agenție nu sunt șterse aici.
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
    lifecycle_status = CASE WHEN v_reactivate AND p.lifecycle_status = 'expired' THEN 'new'::lead_lifecycle_status ELSE p.lifecycle_status END,
    auto_blacklisted_at = CASE WHEN v_reactivate THEN NULL ELSE p.auto_blacklisted_at END,
    auto_blacklist_reason = CASE WHEN v_reactivate THEN NULL ELSE p.auto_blacklist_reason END,
    last_failure_reason = CASE WHEN v_reactivate THEN NULL ELSE p.last_failure_reason END
  WHERE id = p_id;

  PERFORM set_config('app.skip_auto_outreach', 'off', true);

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

REVOKE ALL ON FUNCTION public.admin_update_prospect_phone(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_prospect_phone(uuid, text) TO authenticated, service_role;