CREATE OR REPLACE FUNCTION public.seo_premium_plus_apply_override(
  _url text,
  _title text,
  _meta_description text,
  _extra_keywords jsonb DEFAULT '[]'::jsonb,
  _source_audit_id uuid DEFAULT NULL,
  _applied_by uuid DEFAULT NULL,
  _change_type text DEFAULT 'premium_plus',
  _notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_path text := public.seo_normalize_url_path(_url);
  v_title text := nullif(btrim(coalesce(_title, '')), '');
  v_meta text := nullif(btrim(coalesce(_meta_description, '')), '');
  v_keywords jsonb := coalesce(_extra_keywords, '[]'::jsonb);
  v_current public.seo_overrides%rowtype;
  v_effective_title text;
  v_effective_meta text;
  v_last_version integer := 0;
  v_action text := 'inserted';
  v_changed boolean := true;
  v_caller uuid := auth.uid();
  v_role text := coalesce(auth.role(), '');
  v_actor uuid;
BEGIN
  IF v_role <> 'service_role' THEN
    IF v_caller IS NULL OR NOT public.has_role(v_caller, 'admin'::public.app_role) THEN
      RAISE EXCEPTION 'Only admins can apply SEO Premium Plus overrides';
    END IF;
    v_actor := v_caller;
  ELSE
    v_actor := _applied_by;
  END IF;

  IF v_title IS NOT NULL AND char_length(v_title) > 70 THEN
    v_title := left(v_title, 70);
  END IF;
  IF v_meta IS NOT NULL AND char_length(v_meta) > 165 THEN
    v_meta := left(v_meta, 165);
  END IF;
  IF jsonb_typeof(v_keywords) <> 'array' THEN
    v_keywords := '[]'::jsonb;
  END IF;

  SELECT * INTO v_current
  FROM public.seo_overrides
  WHERE url_path = v_path
  FOR UPDATE;

  IF FOUND THEN
    v_action := 'updated';
    v_effective_title := coalesce(v_title, v_current.title);
    v_effective_meta := coalesce(v_meta, v_current.meta_description);

    v_changed :=
      coalesce(v_current.title, '') IS DISTINCT FROM coalesce(v_effective_title, '') OR
      coalesce(v_current.meta_description, '') IS DISTINCT FROM coalesce(v_effective_meta, '') OR
      coalesce(v_current.extra_keywords, '[]'::jsonb) IS DISTINCT FROM v_keywords OR
      coalesce(v_current.source_audit_id::text, '') IS DISTINCT FROM coalesce(_source_audit_id::text, '');

    IF NOT v_changed THEN
      UPDATE public.seo_overrides
      SET applied_by = v_actor,
          applied_at = now(),
          updated_at = now(),
          is_active = true
      WHERE url_path = v_path;
      RETURN jsonb_build_object('ok', true, 'url_path', v_path, 'action', 'skipped', 'reason', 'unchanged');
    END IF;

    SELECT coalesce(max(version_number), 0) INTO v_last_version
    FROM public.seo_override_history
    WHERE url_path = v_path;

    INSERT INTO public.seo_override_history (
      url_path,
      version_number,
      title,
      meta_description,
      json_ld,
      extra_keywords,
      alt_text_suggestions,
      canonical_url,
      source_audit_id,
      change_type,
      applied_by,
      notes
    ) VALUES (
      v_path,
      v_last_version + 1,
      v_current.title,
      v_current.meta_description,
      v_current.json_ld,
      coalesce(v_current.extra_keywords, '[]'::jsonb),
      coalesce(v_current.alt_text_suggestions, '[]'::jsonb),
      v_current.canonical_url,
      v_current.source_audit_id,
      'snapshot_before_' || coalesce(nullif(_change_type, ''), 'premium_plus'),
      v_actor,
      _notes
    );

    UPDATE public.seo_overrides
    SET title = v_effective_title,
        meta_description = v_effective_meta,
        extra_keywords = v_keywords,
        source_audit_id = _source_audit_id,
        applied_by = v_actor,
        applied_at = now(),
        updated_at = now(),
        is_active = true,
        ai_generated = true,
        ai_generated_at = now(),
        ai_model = coalesce(ai_model, 'seo-premium-plus')
    WHERE url_path = v_path;
  ELSE
    INSERT INTO public.seo_overrides (
      url_path,
      title,
      meta_description,
      extra_keywords,
      source_audit_id,
      applied_by,
      applied_at,
      is_active,
      ai_generated,
      ai_generated_at,
      ai_model
    ) VALUES (
      v_path,
      v_title,
      v_meta,
      v_keywords,
      _source_audit_id,
      v_actor,
      now(),
      true,
      true,
      now(),
      'seo-premium-plus'
    );
  END IF;

  RETURN jsonb_build_object('ok', true, 'url_path', v_path, 'action', v_action);
END;
$$;

REVOKE ALL ON FUNCTION public.seo_premium_plus_apply_override(text, text, text, jsonb, uuid, uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.seo_premium_plus_apply_override(text, text, text, jsonb, uuid, uuid, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.seo_premium_plus_apply_override(text, text, text, jsonb, uuid, uuid, text, text) TO authenticated, service_role;
