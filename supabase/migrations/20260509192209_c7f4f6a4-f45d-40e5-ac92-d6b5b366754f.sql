-- Smart callback scheduling for prospects
ALTER TABLE public.prospect_listings
  ADD COLUMN IF NOT EXISTS next_callback_at timestamptz,
  ADD COLUMN IF NOT EXISTS callback_attempts int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_callback_window text; -- 'morning' | 'afternoon' | 'evening'

CREATE INDEX IF NOT EXISTS idx_prospect_listings_next_callback
  ON public.prospect_listings (next_callback_at)
  WHERE next_callback_at IS NOT NULL;

-- Replace process_voice_call_result with smart callback logic
CREATE OR REPLACE FUNCTION public.process_voice_call_result(
  p_prospect_id uuid,
  p_status text,
  p_twilio_reason text,
  p_is_voicemail boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_failures int;
  v_attempts int;
  v_last_window text;
  v_next_window text;
  v_next_at timestamptz;
  v_invalid_codes text[] := ARRAY['invalid-number','invalid_number','13224','13223','21211','21214','21217'];
  v_callback_statuses text[] := ARRAY['busy','no-answer'];
  v_failure_statuses  text[] := ARRAY['failed','canceled'];
  MAX_CALLBACKS constant int := 3;
BEGIN
  IF p_prospect_id IS NULL THEN RETURN; END IF;

  -- Hard-invalid → mark immediately
  IF p_twilio_reason IS NOT NULL AND (
       lower(p_twilio_reason) = ANY(v_invalid_codes)
       OR p_twilio_reason ~* 'invalid'
  ) THEN
    PERFORM public.mark_prospect_invalid_number(p_prospect_id, 'twilio:' || p_twilio_reason);
    RETURN;
  END IF;

  -- Voicemail → don't bump as failure, leave for human review
  IF p_is_voicemail THEN
    UPDATE public.prospect_listings
       SET consecutive_failures = 0,
           auto_call_triggered_at = NULL
     WHERE id = p_prospect_id;
    RETURN;
  END IF;

  -- Smart callback: busy / no-answer → schedule retry
  IF p_status = ANY(v_callback_statuses) THEN
    SELECT COALESCE(callback_attempts,0), last_callback_window
      INTO v_attempts, v_last_window
    FROM public.prospect_listings WHERE id = p_prospect_id;

    v_attempts := COALESCE(v_attempts,0) + 1;

    IF v_attempts > MAX_CALLBACKS THEN
      -- Exhausted retries → mark failed
      UPDATE public.prospect_listings
         SET lifecycle_status = 'failed'::lead_lifecycle_status,
             auto_call_triggered_at = NULL,
             last_failure_reason = 'callback_exhausted_' || p_status,
             callback_attempts = v_attempts
       WHERE id = p_prospect_id;
      RETURN;
    END IF;

    -- Alternate windows: morning(10-13) → afternoon(13-17) → evening(17-19)
    v_next_window := CASE COALESCE(v_last_window,'')
      WHEN 'morning' THEN 'afternoon'
      WHEN 'afternoon' THEN 'evening'
      WHEN 'evening' THEN 'morning'
      ELSE (CASE
        WHEN extract(hour FROM (now() AT TIME ZONE 'Europe/Bucharest')) < 13 THEN 'afternoon'
        WHEN extract(hour FROM (now() AT TIME ZONE 'Europe/Bucharest')) < 17 THEN 'evening'
        ELSE 'morning' END)
    END;

    -- Schedule >= 4h ahead, snapped to chosen window
    v_next_at := now() + interval '4 hours';
    -- Snap to next-day same window if already past today's window
    DECLARE
      v_local_now timestamp := (now() AT TIME ZONE 'Europe/Bucharest')::timestamp;
      v_target_hour int := CASE v_next_window
        WHEN 'morning' THEN 10
        WHEN 'afternoon' THEN 14
        ELSE 17 END;
      v_candidate timestamp;
    BEGIN
      v_candidate := date_trunc('day', v_local_now) + make_interval(hours => v_target_hour);
      IF v_candidate < v_local_now + interval '4 hours' THEN
        v_candidate := v_candidate + interval '1 day';
      END IF;
      v_next_at := (v_candidate AT TIME ZONE 'Europe/Bucharest');
    END;

    UPDATE public.prospect_listings
       SET lifecycle_status = 'callback'::lead_lifecycle_status,
           auto_call_triggered_at = NULL,
           callback_attempts = v_attempts,
           last_callback_window = v_next_window,
           next_callback_at = v_next_at,
           last_failure_reason = COALESCE(p_twilio_reason, p_status),
           consecutive_failures = 0
     WHERE id = p_prospect_id;
    RETURN;
  END IF;

  -- Hard transient failures (failed/canceled) → bump counter
  IF p_status = ANY(v_failure_statuses) THEN
    UPDATE public.prospect_listings
       SET consecutive_failures = consecutive_failures + 1,
           last_failure_reason = COALESCE(p_twilio_reason, p_status),
           auto_call_triggered_at = NULL
     WHERE id = p_prospect_id
     RETURNING consecutive_failures INTO v_failures;

    IF v_failures IS NOT NULL AND v_failures >= 2 THEN
      PERFORM public.mark_prospect_invalid_number(p_prospect_id,
        '2x_consecutive_' || COALESCE(p_twilio_reason, p_status));
    END IF;
  ELSIF p_status = 'completed' THEN
    UPDATE public.prospect_listings
       SET consecutive_failures = 0,
           callback_attempts = 0,
           next_callback_at = NULL
     WHERE id = p_prospect_id;
  END IF;
END;
$function$;

-- Manual reset: admin confirms number is good
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

  RETURN jsonb_build_object('success', true, 'prospect_id', p_prospect_id);
END;
$function$;