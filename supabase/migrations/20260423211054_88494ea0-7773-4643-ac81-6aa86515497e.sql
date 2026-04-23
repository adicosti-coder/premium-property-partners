-- 1) Track when a prospect was auto-blacklisted by the suspicion engine.
ALTER TABLE public.prospect_listings
  ADD COLUMN IF NOT EXISTS auto_blacklisted_at timestamptz,
  ADD COLUMN IF NOT EXISTS auto_blacklist_reason text;

CREATE INDEX IF NOT EXISTS idx_prospect_listings_auto_blacklisted_at
  ON public.prospect_listings (auto_blacklisted_at)
  WHERE auto_blacklisted_at IS NOT NULL;

-- 2) RPC: auto-blacklist a single prospect by id, IF its suspicion score
--    is >= the configured threshold AND the phone is NOT whitelisted.
--    Returns jsonb: { blacklisted, reason, score, threshold }.
CREATE OR REPLACE FUNCTION public.auto_blacklist_prospect(
  p_prospect_id uuid,
  p_score int,
  p_reasons text[] DEFAULT '{}'::text[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_threshold int;
  v_enabled boolean;
  v_phone text;
  v_domain text;
  v_url text;
  v_already timestamptz;
  v_whitelisted boolean := false;
BEGIN
  -- Load global settings (singleton row id=true).
  SELECT suspicion_threshold, enabled
    INTO v_threshold, v_enabled
  FROM public.agency_detection_settings
  WHERE id = true
  LIMIT 1;

  IF v_threshold IS NULL THEN v_threshold := 70; END IF;
  IF v_enabled IS NULL THEN v_enabled := true; END IF;

  IF NOT v_enabled THEN
    RETURN jsonb_build_object('blacklisted', false, 'reason', 'engine_disabled', 'score', p_score, 'threshold', v_threshold);
  END IF;

  IF p_score < v_threshold THEN
    RETURN jsonb_build_object('blacklisted', false, 'reason', 'below_threshold', 'score', p_score, 'threshold', v_threshold);
  END IF;

  SELECT phone_normalized, source_url, auto_blacklisted_at
    INTO v_phone, v_url, v_already
  FROM public.prospect_listings
  WHERE id = p_prospect_id;

  IF v_already IS NOT NULL THEN
    RETURN jsonb_build_object('blacklisted', false, 'reason', 'already_blacklisted', 'score', p_score, 'threshold', v_threshold);
  END IF;

  v_domain := public.extract_url_domain(v_url);

  -- Whitelist protection: never auto-blacklist a phone or domain on the whitelist.
  IF v_phone IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.agency_whitelist WHERE phone_normalized = v_phone
  ) THEN
    v_whitelisted := true;
  END IF;
  IF NOT v_whitelisted AND v_domain IS NOT NULL AND v_domain <> '' AND EXISTS (
    SELECT 1 FROM public.agency_whitelist WHERE domain = v_domain
  ) THEN
    v_whitelisted := true;
  END IF;

  IF v_whitelisted THEN
    RETURN jsonb_build_object('blacklisted', false, 'reason', 'whitelisted', 'score', p_score, 'threshold', v_threshold);
  END IF;

  -- Mark the prospect itself as agency + auto-blacklisted.
  UPDATE public.prospect_listings
     SET prospect_type = 'agentie',
         is_active = false,
         auto_blacklisted_at = now(),
         auto_blacklist_reason = 'Auto-detected (High Suspicion)'
   WHERE id = p_prospect_id;

  -- Insert into blocklist (idempotent on phone OR domain).
  IF v_phone IS NOT NULL THEN
    INSERT INTO public.agency_blocklist (phone_normalized, reason, notes, source_prospect_id)
    VALUES (v_phone, 'auto_high_suspicion',
            'Auto-detected (High Suspicion). Score=' || p_score || ' / threshold=' || v_threshold ||
            CASE WHEN array_length(p_reasons,1) IS NOT NULL THEN ' · ' || array_to_string(p_reasons, ' · ') ELSE '' END,
            p_prospect_id)
    ON CONFLICT DO NOTHING;
  END IF;

  IF v_domain IS NOT NULL AND v_domain <> '' THEN
    INSERT INTO public.agency_blocklist (domain, reason, notes, source_prospect_id)
    VALUES (v_domain, 'auto_high_suspicion',
            'Auto-detected (High Suspicion). Score=' || p_score || ' / threshold=' || v_threshold,
            p_prospect_id)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Audit trail.
  INSERT INTO public.admin_audit_log (action, actor_label, entity_type, entity_id, details, severity)
  VALUES (
    'agency_auto_blacklist',
    'system',
    'prospect_listing',
    p_prospect_id::text,
    jsonb_build_object(
      'score', p_score,
      'threshold', v_threshold,
      'phone', v_phone,
      'domain', v_domain,
      'reasons', to_jsonb(p_reasons),
      'message', 'Auto-blacklist (High Suspicion)'
    ),
    'warning'
  );

  RETURN jsonb_build_object('blacklisted', true, 'reason', 'auto_high_suspicion', 'score', p_score, 'threshold', v_threshold, 'phone', v_phone, 'domain', v_domain);
END;
$$;

GRANT EXECUTE ON FUNCTION public.auto_blacklist_prospect(uuid, int, text[]) TO authenticated;

-- 3) RPC: bulk archive every prospect already classified as agency, except whitelisted.
--    Only callable by admins.
CREATE OR REPLACE FUNCTION public.bulk_archive_detected_agencies()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int := 0;
  v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL OR NOT public.has_role(v_user, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'forbidden: admin role required';
  END IF;

  WITH targets AS (
    SELECT pl.id, pl.phone_normalized, public.extract_url_domain(pl.source_url) AS domain
    FROM public.prospect_listings pl
    WHERE pl.prospect_type = 'agentie'
      AND pl.is_active = true
      AND NOT EXISTS (
        SELECT 1 FROM public.agency_whitelist w
        WHERE (pl.phone_normalized IS NOT NULL AND w.phone_normalized = pl.phone_normalized)
           OR (public.extract_url_domain(pl.source_url) IS NOT NULL
               AND w.domain = public.extract_url_domain(pl.source_url))
      )
  ),
  upd AS (
    UPDATE public.prospect_listings pl
       SET is_active = false,
           auto_blacklisted_at = COALESCE(pl.auto_blacklisted_at, now()),
           auto_blacklist_reason = COALESCE(pl.auto_blacklist_reason, 'Bulk archive (admin)')
      FROM targets t
     WHERE pl.id = t.id
    RETURNING pl.id
  )
  SELECT count(*) INTO v_count FROM upd;

  -- Add to blocklist (idempotent) for phones we just archived.
  INSERT INTO public.agency_blocklist (phone_normalized, reason, notes, source_prospect_id)
  SELECT DISTINCT pl.phone_normalized, 'bulk_archive', 'Bulk archive admin', pl.id
  FROM public.prospect_listings pl
  WHERE pl.auto_blacklist_reason = 'Bulk archive (admin)'
    AND pl.phone_normalized IS NOT NULL
  ON CONFLICT DO NOTHING;

  INSERT INTO public.admin_audit_log (action, actor_user_id, actor_label, entity_type, details, severity)
  VALUES (
    'agency_bulk_archive',
    v_user,
    'admin',
    'prospect_listing',
    jsonb_build_object('archived_count', v_count, 'message', 'Bulk archive of detected agencies'),
    'warning'
  );

  RETURN jsonb_build_object('archived', v_count);
END;
$$;

GRANT EXECUTE ON FUNCTION public.bulk_archive_detected_agencies() TO authenticated;