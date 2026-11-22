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
  PERFORM set_config('app.restore_triage_state', 'on', true);
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
  PERFORM set_config('app.restore_triage_state', 'off', true);
  RETURN v_restored_wa;
END $function$;

REVOKE ALL ON FUNCTION public._prospect_agency_unmark_row(uuid) FROM PUBLIC, anon, authenticated;