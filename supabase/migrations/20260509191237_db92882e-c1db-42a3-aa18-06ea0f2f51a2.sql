
-- ── Twilio diagnostic + invalid-number cleanup ─────────────────────────
ALTER TABLE public.voice_call_sessions
  ADD COLUMN IF NOT EXISTS twilio_failure_reason text,
  ADD COLUMN IF NOT EXISTS answered_by text, -- human | machine_start | machine_end_beep | fax | unknown
  ADD COLUMN IF NOT EXISTS is_voicemail boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_voice_call_sessions_voicemail
  ON public.voice_call_sessions (is_voicemail) WHERE is_voicemail = true;

ALTER TABLE public.prospect_listings
  ADD COLUMN IF NOT EXISTS consecutive_failures integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS marked_invalid_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS invalid_reason text;

CREATE INDEX IF NOT EXISTS idx_prospect_listings_invalid
  ON public.prospect_listings (marked_invalid_at) WHERE marked_invalid_at IS NOT NULL;

-- Helper: mark a prospect as invalid (used by status callback / cleanup)
CREATE OR REPLACE FUNCTION public.mark_prospect_invalid_number(
  p_prospect_id uuid,
  p_reason text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.prospect_listings
     SET lifecycle_status = 'failed'::lead_lifecycle_status,
         marked_invalid_at = COALESCE(marked_invalid_at, now()),
         invalid_reason = COALESCE(invalid_reason, p_reason),
         last_failure_reason = COALESCE(p_reason, last_failure_reason),
         auto_call_triggered_at = NULL,
         admin_notes = COALESCE(admin_notes || E'\n', '') || 'Auto-marked invalid: ' || p_reason
   WHERE id = p_prospect_id;
END;
$$;

-- Process call result: increment consecutive_failures or reset; auto-mark invalid
CREATE OR REPLACE FUNCTION public.process_voice_call_result(
  p_prospect_id uuid,
  p_status text,
  p_twilio_reason text,
  p_is_voicemail boolean
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_failures int;
  v_invalid_codes text[] := ARRAY['invalid-number','invalid_number','13224','13223','21211','21214','21217'];
  v_failure_statuses text[] := ARRAY['failed','busy','no-answer','canceled'];
BEGIN
  IF p_prospect_id IS NULL THEN RETURN; END IF;

  -- Hard-invalid based on Twilio code/reason → mark immediately
  IF p_twilio_reason IS NOT NULL AND (
       lower(p_twilio_reason) = ANY(v_invalid_codes)
       OR p_twilio_reason ~* 'invalid'
  ) THEN
    PERFORM public.mark_prospect_invalid_number(p_prospect_id, 'twilio:' || p_twilio_reason);
    RETURN;
  END IF;

  -- Voicemail/robot → don't bump as "failure", just leave as callback (handled elsewhere)
  IF p_is_voicemail THEN
    UPDATE public.prospect_listings
       SET consecutive_failures = 0,
           auto_call_triggered_at = NULL
     WHERE id = p_prospect_id;
    RETURN;
  END IF;

  -- If terminal failure → bump counter
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
       SET consecutive_failures = 0
     WHERE id = p_prospect_id;
  END IF;
END;
$$;
