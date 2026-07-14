
CREATE OR REPLACE FUNCTION public.seo_premium_plus_rollback_override(_url_path text, _applied_by uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _current_id uuid;
  _prev record;
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

    RETURN jsonb_build_object('ok', true, 'action', 'restored_previous', 'url_path', _url_path);
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

    RETURN jsonb_build_object('ok', true, 'action', 'deactivated', 'url_path', _url_path);
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.seo_premium_plus_rollback_override(text, uuid) TO authenticated;
