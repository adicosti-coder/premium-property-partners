CREATE OR REPLACE FUNCTION public.fire_prospect_scorer_and_dialer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  needs_score boolean;
  needs_persona boolean;
  secret text;
BEGIN
  BEGIN
    secret := public.get_cron_reconcile_secret();
  EXCEPTION WHEN OTHERS THEN
    secret := NULL;
  END;

  IF secret IS NULL OR secret = '' THEN
    RETURN NEW;
  END IF;

  needs_score := (NEW.ai_scored_at IS NULL)
                 AND (coalesce(NEW.description, '') <> '' OR coalesce(NEW.title, '') <> '');

  IF (TG_OP = 'INSERT') AND needs_score THEN
    PERFORM net.http_post(
      url := 'https://mvzssjyzbwccioqvhjpo.supabase.co/functions/v1/prospect-ai-scorer',
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', secret),
      body := jsonb_build_object('prospect_id', NEW.id)
    );
  END IF;

  needs_persona := (NEW.persona_generated_at IS NULL)
                   AND (coalesce(NEW.description, '') <> '' OR coalesce(NEW.title, '') <> '');

  IF (TG_OP = 'INSERT') AND needs_persona THEN
    PERFORM net.http_post(
      url := 'https://mvzssjyzbwccioqvhjpo.supabase.co/functions/v1/prospect-persona-snapshot',
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', secret),
      body := jsonb_build_object('prospect_id', NEW.id)
    );
  END IF;

  -- Auto-dial rămâne dezactivat intenționat (apelurile se lansează manual din Admin).
  RETURN NEW;
END;
$$;
