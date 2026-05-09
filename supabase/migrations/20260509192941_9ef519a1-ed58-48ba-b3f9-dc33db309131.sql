-- Notificare "Lead Recuperat" când un prospect anterior cu busy/no-answer
-- ajunge la appointment_scheduled_at în urma unui call back.
CREATE OR REPLACE FUNCTION public.notify_lead_recovered_callback()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  admin_id uuid;
  had_failed_attempts boolean := false;
  prospect_attempts int;
  prospect_phone text;
BEGIN
  -- Only fire when appointment_scheduled_at transitions to non-null
  IF NEW.appointment_scheduled_at IS NULL THEN RETURN NEW; END IF;
  IF OLD.appointment_scheduled_at IS NOT NULL THEN RETURN NEW; END IF;
  IF NEW.prospect_listing_id IS NULL THEN RETURN NEW; END IF;

  -- Check if prospect had prior busy/no-answer attempts
  SELECT callback_attempts, phone_normalized
    INTO prospect_attempts, prospect_phone
  FROM public.prospect_listings
  WHERE id = NEW.prospect_listing_id;

  IF COALESCE(prospect_attempts, 0) > 0 THEN
    had_failed_attempts := true;
  ELSE
    -- Cross-check via prior sessions on same prospect
    SELECT EXISTS (
      SELECT 1 FROM public.voice_call_sessions
      WHERE prospect_listing_id = NEW.prospect_listing_id
        AND id <> NEW.id
        AND status IN ('busy','no-answer')
    ) INTO had_failed_attempts;
  END IF;

  IF NOT had_failed_attempts THEN RETURN NEW; END IF;

  -- Notify all admins
  FOR admin_id IN
    SELECT user_id FROM public.user_roles WHERE role = 'admin'
  LOOP
    INSERT INTO public.user_notifications (
      user_id, title, message, type, action_url, action_label
    ) VALUES (
      admin_id,
      '🎯 Lead recuperat prin Call Back!',
      'Prospectul ' || COALESCE(prospect_phone, NEW.to_number) ||
      ' (anterior nu răspundea / ocupat) a fost convertit într-o programare după ' ||
      COALESCE(prospect_attempts, 1) || ' încercări de call back. Andrei a recuperat lead-ul.',
      'success',
      '/admin?tab=voice-agent',
      'Vezi apelul'
    );
  END LOOP;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_notify_lead_recovered_callback ON public.voice_call_sessions;
CREATE TRIGGER trg_notify_lead_recovered_callback
AFTER UPDATE OF appointment_scheduled_at ON public.voice_call_sessions
FOR EACH ROW
EXECUTE FUNCTION public.notify_lead_recovered_callback();