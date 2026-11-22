DROP POLICY IF EXISTS "Users can update their own comments" ON public.blog_comments;

DROP POLICY IF EXISTS "Authenticated users can vote" ON public.article_votes;
CREATE POLICY "Authenticated users can vote"
ON public.article_votes
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.user_article_submissions s
    WHERE s.id = submission_id
      AND s.user_id <> auth.uid()
      AND s.status IN ('approved', 'winner')
  )
);

CREATE OR REPLACE FUNCTION public.redeem_owner_code(p_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_code_row record;
  v_sanitized text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  IF p_code IS NULL OR length(trim(p_code)) < 3 OR length(trim(p_code)) > 50 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_code');
  END IF;

  v_sanitized := upper(regexp_replace(trim(p_code), '[^A-Za-z0-9\-]', '', 'g'));

  SELECT id, property_id, is_used, expires_at
    INTO v_code_row
  FROM public.owner_codes
  WHERE code = v_sanitized
  FOR UPDATE;

  IF NOT FOUND
     OR v_code_row.is_used
     OR (v_code_row.expires_at IS NOT NULL AND v_code_row.expires_at <= now()) THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_or_used_code');
  END IF;

  UPDATE public.owner_codes
     SET is_used = true,
         used_by = v_user_id,
         used_at = COALESCE(used_at, now())
   WHERE id = v_code_row.id;

  INSERT INTO public.owner_properties (user_id, property_id)
  VALUES (v_user_id, v_code_row.property_id)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'owner')
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object('success', true, 'property_id', v_code_row.property_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.leads_dedupe_upsert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_phone_raw  text := NULLIF(trim(NEW.whatsapp_number), '');
  v_phone      text;
  v_email      text := lower(NULLIF(trim(NEW.email), ''));
  v_existing   public.leads;
  v_entry      jsonb;
  v_secret     text;
BEGIN
  IF v_phone_raw IN ('-', 'PRECALC_NO_PHONE', '0', 'n/a', 'N/A', 'pending') THEN
    v_phone_raw := NULL;
  END IF;
  v_phone := public.normalize_ro_phone(v_phone_raw);

  IF v_phone IS NULL AND v_email IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_existing
  FROM public.leads
  WHERE (v_phone IS NOT NULL AND public.normalize_ro_phone(whatsapp_number) = v_phone)
     OR (v_email IS NOT NULL AND lower(email) = v_email)
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_existing.id IS NULL THEN
    RETURN NEW;
  END IF;

  -- A repeat submission cannot prove it belongs to the stored contact:
  -- its values are only logged, and only empty fields are filled.
  v_entry := jsonb_build_object(
    'at', to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SSOF'),
    'source', COALESCE(NEW.source, 'unknown'),
    'campaign', COALESCE(NEW.simulation_data->>'campaign', NEW.simulation_data->>'utm_campaign'),
    'name', NULLIF(trim(NEW.name), ''),
    'email', v_email,
    'phone', v_phone_raw,
    'property_type', NEW.property_type,
    'property_area', NEW.property_area,
    'score', NEW.lead_score,
    'grade', NEW.lead_grade,
    'message', NULLIF(NEW.message, '')
  );

  UPDATE public.leads SET
    name              = CASE WHEN NULLIF(trim(name), '') IS NULL THEN NULLIF(trim(NEW.name), '') ELSE name END,
    email             = COALESCE(NULLIF(trim(email), ''), v_email),
    whatsapp_number   = CASE WHEN NULLIF(trim(whatsapp_number), '') IS NULL
                               OR trim(whatsapp_number) IN ('-', 'PRECALC_NO_PHONE', '0', 'n/a', 'N/A', 'pending')
                             THEN COALESCE(v_phone_raw, whatsapp_number) ELSE whatsapp_number END,
    property_type     = COALESCE(property_type, NEW.property_type),
    property_area     = COALESCE(property_area, NEW.property_area),
    simulation_data   = COALESCE(NEW.simulation_data, '{}'::jsonb) || COALESCE(simulation_data, '{}'::jsonb),
    message           = COALESCE(NULLIF(message, ''), NULLIF(NEW.message, '')),
    touch_count       = touch_count + 1,
    engagement_status = 're_engaged',
    is_read           = false,
    activity_history  = COALESCE(activity_history, '[]'::jsonb) || jsonb_build_array(v_entry),
    last_touch_at     = now(),
    updated_at        = now()
  WHERE id = v_existing.id
  RETURNING * INTO v_existing;

  BEGIN
    v_secret := public.get_cron_reconcile_secret();
    PERFORM net.http_post(
      url := 'https://mvzssjyzbwccioqvhjpo.supabase.co/functions/v1/lead-score-dispatch',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', COALESCE(v_secret, '')
      ),
      body := jsonb_build_object(
        'event', 'lead.re_engaged',
        'record', row_to_json(v_existing)::jsonb
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'leads_dedupe_upsert dispatch failed: %', SQLERRM;
  END;

  RETURN NULL;
END;
$function$;