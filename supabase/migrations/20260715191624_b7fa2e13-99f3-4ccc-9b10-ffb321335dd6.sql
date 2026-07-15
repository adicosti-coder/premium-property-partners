
-- 1) delete_email: add admin gate + audit
CREATE OR REPLACE FUNCTION public.delete_email(queue_name text, message_id bigint)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pgmq'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_ok boolean;
BEGIN
  IF v_user IS NULL OR NOT public.has_role(v_user, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'forbidden: admin role required';
  END IF;

  BEGIN
    v_ok := pgmq.delete(queue_name, message_id);
  EXCEPTION WHEN undefined_table THEN
    v_ok := FALSE;
  END;

  INSERT INTO public.admin_audit_log (actor_user_id, action, entity_type, entity_id, details, severity)
  VALUES (v_user, 'queue_message_delete', 'pgmq_queue', queue_name,
          jsonb_build_object('message_id', message_id, 'ok', v_ok), 'warning');

  RETURN v_ok;
END;
$function$;

-- 2) revoke_admin_mfa: add audit log (behavior unchanged: self-revoke only)
CREATE OR REPLACE FUNCTION public.revoke_admin_mfa()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'forbidden: not authenticated';
  END IF;
  DELETE FROM public.admin_mfa_sessions WHERE user_id = v_user;
  INSERT INTO public.admin_audit_log (actor_user_id, action, entity_type, entity_id, details, severity)
  VALUES (v_user, 'admin_mfa_revoke', 'admin_mfa_session', v_user::text,
          jsonb_build_object('self', true), 'info');
END;
$function$;

-- 3) reset_prospect_invalid_status: keep admin gate, add audit log
CREATE OR REPLACE FUNCTION public.reset_prospect_invalid_status(p_prospect_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL OR NOT public.has_role(v_user, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'forbidden: admin role required';
  END IF;

  UPDATE public.prospect_listings
     SET lifecycle_status = 'new'::lead_lifecycle_status,
         marked_invalid_at = NULL,
         invalid_reason = NULL,
         consecutive_failures = 0,
         callback_attempts = 0,
         next_callback_at = NULL,
         last_callback_window = NULL,
         auto_call_triggered_at = NULL,
         last_failure_reason = NULL,
         retry_count = 0,
         admin_notes = COALESCE(admin_notes || E'\n', '') ||
           'Reset manual de admin la ' || to_char(now(),'YYYY-MM-DD HH24:MI')
   WHERE id = p_prospect_id;

  INSERT INTO public.admin_audit_log (actor_user_id, action, entity_type, entity_id, details, severity)
  VALUES (v_user, 'prospect_reset_invalid', 'prospect_listing', p_prospect_id::text,
          jsonb_build_object('prospect_id', p_prospect_id), 'warning');

  RETURN jsonb_build_object('success', true, 'prospect_id', p_prospect_id);
END;
$function$;

-- 4) seo_premium_plus_rollback_override: add audit log; keep admin gate
CREATE OR REPLACE FUNCTION public.seo_premium_plus_rollback_override(_url_path text, _applied_by uuid DEFAULT NULL::uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _current_id uuid;
  _prev record;
  _result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'forbidden');
  END IF;

  SELECT id INTO _current_id FROM public.seo_overrides
    WHERE url_path = _url_path AND is_active = true
    ORDER BY updated_at DESC NULLS LAST, applied_at DESC NULLS LAST
    LIMIT 1;

  IF _current_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_active_override');
  END IF;

  SELECT title, meta_description, extra_keywords, json_ld, alt_text_suggestions, canonical_url, source_audit_id
    INTO _prev
    FROM public.seo_override_history
    WHERE url_path = _url_path
      AND reverted_at IS NULL
    ORDER BY version_number DESC
    OFFSET 1 LIMIT 1;

  IF FOUND THEN
    UPDATE public.seo_overrides
      SET title = _prev.title,
          meta_description = _prev.meta_description,
          extra_keywords = COALESCE(_prev.extra_keywords, '[]'::jsonb),
          json_ld = _prev.json_ld,
          alt_text_suggestions = _prev.alt_text_suggestions,
          canonical_url = _prev.canonical_url,
          updated_at = now(),
          applied_by = COALESCE(_applied_by, auth.uid()),
          pending_review = false
      WHERE id = _current_id;

    INSERT INTO public.seo_override_history
      (url_path, version_number, title, meta_description, extra_keywords,
       source_audit_id, applied_by, change_type, notes)
    SELECT _url_path,
           COALESCE((SELECT MAX(version_number) FROM public.seo_override_history WHERE url_path = _url_path), 0) + 1,
           _prev.title, _prev.meta_description, _prev.extra_keywords,
           _prev.source_audit_id, COALESCE(_applied_by, auth.uid()),
           'rollback', 'Rollback to previous version';

    _result := jsonb_build_object('ok', true, 'action', 'restored_previous', 'url_path', _url_path);
  ELSE
    UPDATE public.seo_overrides
      SET is_active = false, updated_at = now()
      WHERE id = _current_id;

    INSERT INTO public.seo_override_history
      (url_path, version_number, title, meta_description, applied_by, change_type, notes, reverted_at)
    VALUES (_url_path,
            COALESCE((SELECT MAX(version_number) FROM public.seo_override_history WHERE url_path = _url_path), 0) + 1,
            NULL, NULL, COALESCE(_applied_by, auth.uid()),
            'rollback_deactivate', 'Rollback with no previous version — override deactivated', now());

    _result := jsonb_build_object('ok', true, 'action', 'deactivated', 'url_path', _url_path);
  END IF;

  INSERT INTO public.admin_audit_log (actor_user_id, action, entity_type, entity_id, details, severity)
  VALUES (auth.uid(), 'seo_override_rollback', 'seo_override', _url_path,
          _result, 'warning');

  RETURN _result;
END;
$function$;
