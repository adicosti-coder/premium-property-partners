
-- G: Auto-blacklist after 3 consecutive AMD (voicemail) detections per prospect
CREATE OR REPLACE FUNCTION public.auto_blacklist_on_consecutive_amd()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_recent_calls record;
  v_amd_streak int := 0;
  v_total int := 0;
BEGIN
  -- Only act when this row just became a voicemail/AMD
  IF NOT (COALESCE(NEW.is_voicemail, false) = true
          OR COALESCE(NEW.answered_by, '') LIKE 'machine_%') THEN
    RETURN NEW;
  END IF;

  IF NEW.prospect_listing_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Count last 3 final calls for this prospect; require all 3 to be AMD
  FOR v_recent_calls IN
    SELECT is_voicemail, answered_by, status
    FROM public.voice_call_sessions
    WHERE prospect_listing_id = NEW.prospect_listing_id
      AND status IN ('completed','failed','busy','no-answer','canceled')
    ORDER BY COALESCE(ended_at, created_at) DESC
    LIMIT 3
  LOOP
    v_total := v_total + 1;
    IF COALESCE(v_recent_calls.is_voicemail, false) = true
       OR COALESCE(v_recent_calls.answered_by, '') LIKE 'machine_%' THEN
      v_amd_streak := v_amd_streak + 1;
    END IF;
  END LOOP;

  IF v_total >= 3 AND v_amd_streak >= 3 THEN
    UPDATE public.prospect_listings
       SET is_active = false,
           auto_blacklisted_at = COALESCE(auto_blacklisted_at, now()),
           auto_blacklist_reason = COALESCE(auto_blacklist_reason, 'Voicemail x3 consecutive (AMD)'),
           last_failure_reason = 'Voicemail x3 consecutive (AMD)',
           admin_notes = COALESCE(admin_notes || E'\n', '') || 'Auto-blacklist: 3 voicemail consecutive @ ' || now()::text
     WHERE id = NEW.prospect_listing_id
       AND auto_blacklisted_at IS NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_blacklist_amd ON public.voice_call_sessions;
CREATE TRIGGER trg_auto_blacklist_amd
AFTER INSERT OR UPDATE OF is_voicemail, answered_by, status
ON public.voice_call_sessions
FOR EACH ROW
EXECUTE FUNCTION public.auto_blacklist_on_consecutive_amd();
