-- Disable auto-dialing on insert. Admin must manually press "Trimite" in UI.
-- Keeps AI scorer + Persona Snapshot triggers; removes the speed-to-lead auto-call branch.
CREATE OR REPLACE FUNCTION public.fire_prospect_scorer_and_dialer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  needs_score boolean;
  needs_persona boolean;
  service_key text;
BEGIN
  BEGIN
    service_key := current_setting('app.settings.service_role_key', true);
  EXCEPTION WHEN OTHERS THEN
    service_key := NULL;
  END;

  needs_score := (NEW.ai_scored_at IS NULL)
                 AND (coalesce(NEW.description, '') <> '' OR coalesce(NEW.title, '') <> '');

  IF (TG_OP = 'INSERT') AND needs_score THEN
    PERFORM net.http_post(
      url := 'https://mvzssjyzbwccioqvhjpo.supabase.co/functions/v1/prospect-ai-scorer',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || coalesce(service_key, '')
      ),
      body := jsonb_build_object('prospect_id', NEW.id)
    );
  END IF;

  needs_persona := (NEW.persona_generated_at IS NULL)
                   AND (coalesce(NEW.description, '') <> '' OR coalesce(NEW.title, '') <> '');

  IF (TG_OP = 'INSERT') AND needs_persona THEN
    PERFORM net.http_post(
      url := 'https://mvzssjyzbwccioqvhjpo.supabase.co/functions/v1/prospect-persona-snapshot',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || coalesce(service_key, '')
      ),
      body := jsonb_build_object('prospect_id', NEW.id)
    );
  END IF;

  -- NOTE: Auto-dial intentionally removed. Admin triggers calls manually
  -- via the "Trimite" button in the Prospect Listings UI after reviewing
  -- the Persona Snapshot.

  RETURN NEW;
END;
$function$;