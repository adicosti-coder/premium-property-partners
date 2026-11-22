ALTER TABLE public.prospect_listings
  ADD COLUMN IF NOT EXISTS dismissed_at timestamptz,
  ADD COLUMN IF NOT EXISTS dismissed_by uuid,
  ADD COLUMN IF NOT EXISTS dismissed_reason text,
  ADD COLUMN IF NOT EXISTS dismissed_prev jsonb;

CREATE INDEX IF NOT EXISTS idx_prospect_listings_dismissed_at ON public.prospect_listings (dismissed_at) WHERE dismissed_at IS NOT NULL;

CREATE OR REPLACE FUNCTION public.admin_dismiss_prospect(p_id uuid, p_reason text DEFAULT 'indisponibil')
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
  v_reason text := left(COALESCE(NULLIF(trim(p_reason), ''), 'indisponibil'), 120);
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO p FROM public.prospect_listings WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002'; END IF;
  IF p.dismissed_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'already', true, 'dismissed_at', p.dismissed_at);
  END IF;

  WITH c AS (
    UPDATE public.wa_outbound_queue SET status = 'cancelled', last_error = 'dismissed_by_admin', updated_at = now()
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

  UPDATE public.prospect_listings SET
    dismissed_at = now(),
    dismissed_by = auth.uid(),
    dismissed_reason = v_reason,
    dismissed_prev = jsonb_build_object(
      'is_active', p.is_active, 'lifecycle_status', p.lifecycle_status,
      'outreach_status', p.outreach_status, 'outreach_scheduled_at', p.outreach_scheduled_at,
      'outreach_error', p.outreach_error,
      'wa_queue_ids', to_jsonb(v_wa), 'owner_outreach', v_oom, 'ghost_ids', to_jsonb(v_ghost)),
    is_active = false,
    lifecycle_status = 'expired',
    outreach_status = CASE WHEN p.outreach_status IS NULL OR p.outreach_status = 'queued' THEN 'skipped' ELSE p.outreach_status END,
    outreach_scheduled_at = NULL,
    outreach_error = CASE WHEN p.outreach_status IS NULL OR p.outreach_status = 'queued' THEN 'dismissed_by_admin' ELSE p.outreach_error END
  WHERE id = p_id;

  INSERT INTO public.admin_audit_log (actor_user_id, action, entity_type, entity_id, details)
  VALUES (auth.uid(), 'prospect.dismiss', 'prospect_listing', p_id::text,
          jsonb_build_object('reason', v_reason, 'cancelled_wa', cardinality(v_wa),
                             'cancelled_owner_outreach', jsonb_array_length(v_oom), 'cancelled_calls', cardinality(v_ghost)));

  RETURN jsonb_build_object('ok', true, 'cancelled_wa', cardinality(v_wa),
    'cancelled_owner_outreach', jsonb_array_length(v_oom), 'cancelled_calls', cardinality(v_ghost));
END $function$;

CREATE OR REPLACE FUNCTION public.admin_restore_prospect(p_id uuid)
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
  IF p.dismissed_at IS NULL THEN RETURN jsonb_build_object('ok', true, 'already', true); END IF;
  v_prev := COALESCE(p.dismissed_prev, '{}'::jsonb);

  UPDATE public.wa_outbound_queue SET status = 'pending', last_error = NULL, updated_at = now()
  WHERE prospect_listing_id = p_id AND status = 'cancelled' AND last_error = 'dismissed_by_admin'
    AND id::text IN (SELECT jsonb_array_elements_text(COALESCE(v_prev->'wa_queue_ids', '[]'::jsonb)));
  GET DIAGNOSTICS v_restored_wa = ROW_COUNT;

  UPDATE public.owner_outreach_messages o SET status = x.status, updated_at = now()
  FROM jsonb_to_recordset(COALESCE(v_prev->'owner_outreach', '[]'::jsonb)) AS x(id uuid, status text)
  WHERE o.id = x.id AND o.status = 'cancelled';

  UPDATE public.voice_ghosting_queue SET status = 'pending'
  WHERE prospect_id = p_id AND status = 'cancelled'
    AND id::text IN (SELECT jsonb_array_elements_text(COALESCE(v_prev->'ghost_ids', '[]'::jsonb)));

  UPDATE public.prospect_listings SET
    is_active = COALESCE((v_prev->>'is_active')::boolean, p.is_active),
    lifecycle_status = COALESCE((v_prev->>'lifecycle_status')::public.lead_lifecycle_status, p.lifecycle_status),
    outreach_status = CASE WHEN p.outreach_error = 'dismissed_by_admin' THEN v_prev->>'outreach_status' ELSE p.outreach_status END,
    outreach_scheduled_at = CASE WHEN p.outreach_error = 'dismissed_by_admin' THEN (v_prev->>'outreach_scheduled_at')::timestamptz ELSE p.outreach_scheduled_at END,
    outreach_error = CASE WHEN p.outreach_error = 'dismissed_by_admin' THEN v_prev->>'outreach_error' ELSE p.outreach_error END,
    dismissed_at = NULL, dismissed_by = NULL, dismissed_reason = NULL, dismissed_prev = NULL
  WHERE id = p_id;

  INSERT INTO public.admin_audit_log (actor_user_id, action, entity_type, entity_id, details)
  VALUES (auth.uid(), 'prospect.restore', 'prospect_listing', p_id::text, jsonb_build_object('restored_wa', v_restored_wa));

  RETURN jsonb_build_object('ok', true, 'restored_wa', v_restored_wa);
END $function$;

REVOKE ALL ON FUNCTION public.admin_dismiss_prospect(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_restore_prospect(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_dismiss_prospect(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_restore_prospect(uuid) TO authenticated, service_role;