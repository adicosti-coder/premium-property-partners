-- Add Persona Snapshot columns
ALTER TABLE public.prospect_listings
  ADD COLUMN IF NOT EXISTS persona_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS persona_generated_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_prospect_listings_persona_generated_at
  ON public.prospect_listings (persona_generated_at);

-- Extend the existing fire_prospect_scorer_and_dialer trigger to also fire
-- the persona-snapshot edge function in parallel with the AI scorer on INSERT.
CREATE OR REPLACE FUNCTION public.fire_prospect_scorer_and_dialer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  needs_score boolean;
  needs_persona boolean;
  ready_to_call boolean;
  service_key text;
BEGIN
  BEGIN
    service_key := current_setting('app.settings.service_role_key', true);
  EXCEPTION WHEN OTHERS THEN
    service_key := NULL;
  END;

  -- (a) Fire AI scorer if no score yet
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

  -- (a2) Fire Persona Snapshot generator (parallel to scorer)
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

  -- (b) Fire auto-dial if score>80 (speed-to-lead instant)
  ready_to_call := coalesce(NEW.lead_score, 0) > 80
                   AND NEW.lifecycle_status = 'new'
                   AND NEW.phone_normalized IS NOT NULL
                   AND length(NEW.phone_normalized) >= 8
                   AND NEW.auto_call_triggered_at IS NULL;

  IF ready_to_call THEN
    UPDATE public.prospect_listings
       SET lifecycle_status = 'calling',
           auto_call_triggered_at = now()
     WHERE id = NEW.id AND auto_call_triggered_at IS NULL;

    PERFORM net.http_post(
      url := 'https://mvzssjyzbwccioqvhjpo.supabase.co/functions/v1/voice-agent-auto-dial',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || coalesce(service_key, '')
      ),
      body := jsonb_build_object('triggered_prospect_id', NEW.id, 'source', 'db_trigger')
    );
  END IF;

  RETURN NEW;
END;
$function$;