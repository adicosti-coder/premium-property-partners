-- Remove sensitive tables from realtime publication to prevent broad live broadcasts of PII
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.leads;
  EXCEPTION WHEN undefined_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.scraper_leads_archive_2026;
  EXCEPTION WHEN undefined_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.voice_call_sessions;
  EXCEPTION WHEN undefined_object THEN NULL;
  END;
END $$;

-- Ensure admin audit logs are writable only by backend service/admin internals, not public clients
DROP POLICY IF EXISTS "Service role can insert admin access logs" ON public.admin_access_logs;
CREATE POLICY "Service role can insert admin access logs"
ON public.admin_access_logs
FOR INSERT
TO service_role
WITH CHECK (true);

-- Add an explicit admin guard to the security-definer auto blacklist RPC
CREATE OR REPLACE FUNCTION public.auto_blacklist_prospect(p_prospect_id uuid, p_score integer, p_reasons text[] DEFAULT '{}'::text[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_threshold int;
  v_enabled boolean;
  v_phone text;
  v_domain text;
  v_url text;
  v_already timestamptz;
  v_whitelisted boolean := false;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'forbidden: admin role required';
  END IF;

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

  IF v_phone IS NOT NULL AND EXISTS (SELECT 1 FROM public.agency_whitelist WHERE phone_normalized = v_phone) THEN
    v_whitelisted := true;
  END IF;
  IF NOT v_whitelisted AND v_domain IS NOT NULL AND v_domain <> '' AND EXISTS (SELECT 1 FROM public.agency_whitelist WHERE domain = v_domain) THEN
    v_whitelisted := true;
  END IF;

  IF v_whitelisted THEN
    RETURN jsonb_build_object('blacklisted', false, 'reason', 'whitelisted', 'score', p_score, 'threshold', v_threshold);
  END IF;

  UPDATE public.prospect_listings
     SET prospect_type = 'agentie',
         is_active = false,
         auto_blacklisted_at = now(),
         auto_blacklist_reason = 'Auto-detected (High Suspicion)'
   WHERE id = p_prospect_id;

  IF v_phone IS NOT NULL THEN
    INSERT INTO public.agency_blocklist (phone_normalized, reason, notes, source_prospect_id)
    VALUES (v_phone, 'auto_high_suspicion', 'Auto-detected (High Suspicion). Score=' || p_score || ' / threshold=' || v_threshold, p_prospect_id)
    ON CONFLICT DO NOTHING;
  END IF;

  IF v_domain IS NOT NULL AND v_domain <> '' THEN
    INSERT INTO public.agency_blocklist (domain, reason, notes, source_prospect_id)
    VALUES (v_domain, 'auto_high_suspicion', 'Auto-detected (High Suspicion). Score=' || p_score || ' / threshold=' || v_threshold, p_prospect_id)
    ON CONFLICT DO NOTHING;
  END IF;

  INSERT INTO public.admin_audit_log (action, actor_user_id, actor_label, entity_type, entity_id, details, severity)
  VALUES ('agency_auto_blacklist', auth.uid(), 'admin', 'prospect_listing', p_prospect_id::text,
    jsonb_build_object('score', p_score, 'threshold', v_threshold, 'phone', v_phone, 'domain', v_domain, 'reasons', to_jsonb(p_reasons)),
    'warning');

  RETURN jsonb_build_object('blacklisted', true, 'reason', 'auto_high_suspicion', 'score', p_score, 'threshold', v_threshold, 'phone', v_phone, 'domain', v_domain);
END;
$function$;