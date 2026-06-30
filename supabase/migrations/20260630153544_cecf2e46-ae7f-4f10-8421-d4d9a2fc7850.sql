-- SEO Premium Plus reliability + yield optimization

CREATE TABLE IF NOT EXISTS public.seo_premium_plus_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mode text NOT NULL,
  status text NOT NULL DEFAULT 'running',
  total_count integer NOT NULL DEFAULT 0,
  processed_count integer NOT NULL DEFAULT 0,
  success_count integer NOT NULL DEFAULT 0,
  error_count integer NOT NULL DEFAULT 0,
  skipped_count integer NOT NULL DEFAULT 0,
  started_by uuid,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  results jsonb NOT NULL DEFAULT '[]'::jsonb,
  error_summary text
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.seo_premium_plus_runs TO authenticated;
GRANT ALL ON public.seo_premium_plus_runs TO service_role;

ALTER TABLE public.seo_premium_plus_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage seo_premium_plus_runs"
  ON public.seo_premium_plus_runs
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Service role manages seo_premium_plus_runs"
  ON public.seo_premium_plus_runs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS seo_premium_plus_runs_started_idx
  ON public.seo_premium_plus_runs (started_at DESC);
CREATE INDEX IF NOT EXISTS seo_premium_plus_runs_status_idx
  ON public.seo_premium_plus_runs (status, started_at DESC);

-- Explicit Data API grants for SEO tables used by admin UI and edge functions.
GRANT SELECT ON public.seo_audits TO authenticated;
GRANT ALL ON public.seo_audits TO service_role;
GRANT SELECT ON public.seo_overrides TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seo_overrides TO authenticated;
GRANT ALL ON public.seo_overrides TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seo_override_history TO authenticated;
GRANT ALL ON public.seo_override_history TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.seo_audit_log TO authenticated;
GRANT ALL ON public.seo_audit_log TO service_role;

CREATE OR REPLACE FUNCTION public.seo_normalize_url_path(_url text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v text := coalesce(trim(_url), '/');
  p text;
BEGIN
  IF v = '' THEN
    RETURN '/';
  END IF;

  IF v ~* '^https?://' THEN
    p := regexp_replace(v, '^https?://[^/]+', '', 'i');
  ELSE
    p := v;
  END IF;

  p := split_part(split_part(p, '#', 1), '?', 1);
  IF p = '' THEN p := '/'; END IF;
  IF left(p, 1) <> '/' THEN p := '/' || p; END IF;
  p := regexp_replace(p, '/+', '/', 'g');
  IF length(p) > 1 THEN p := regexp_replace(p, '/+$', ''); END IF;
  RETURN coalesce(nullif(p, ''), '/');
END;
$$;

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
  v_last_version integer := 0;
  v_action text := 'inserted';
  v_changed boolean := true;
BEGIN
  IF _applied_by IS NOT NULL AND NOT public.has_role(_applied_by, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Only admins can apply SEO Premium Plus overrides';
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
    v_changed :=
      coalesce(v_current.title, '') IS DISTINCT FROM coalesce(v_title, '') OR
      coalesce(v_current.meta_description, '') IS DISTINCT FROM coalesce(v_meta, '') OR
      coalesce(v_current.extra_keywords, '[]'::jsonb) IS DISTINCT FROM v_keywords OR
      coalesce(v_current.source_audit_id::text, '') IS DISTINCT FROM coalesce(_source_audit_id::text, '');

    IF NOT v_changed THEN
      UPDATE public.seo_overrides
      SET applied_by = _applied_by,
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
      _applied_by,
      _notes
    );

    UPDATE public.seo_overrides
    SET title = v_title,
        meta_description = v_meta,
        extra_keywords = v_keywords,
        source_audit_id = _source_audit_id,
        applied_by = _applied_by,
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
      _applied_by,
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

GRANT EXECUTE ON FUNCTION public.seo_normalize_url_path(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.seo_premium_plus_apply_override(text, text, text, jsonb, uuid, uuid, text, text) TO authenticated, service_role;
