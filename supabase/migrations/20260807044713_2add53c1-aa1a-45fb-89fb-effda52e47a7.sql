CREATE OR REPLACE FUNCTION public.leads_dispatch_scored()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'vault'
AS $function$
DECLARE cron_secret text;
BEGIN
  SELECT decrypted_secret INTO cron_secret
  FROM vault.decrypted_secrets WHERE name = 'cron_reconcile_secret' LIMIT 1;

  PERFORM net.http_post(
    url := 'https://mvzssjyzbwccioqvhjpo.supabase.co/functions/v1/lead-score-dispatch',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', coalesce(cron_secret, '')
    ),
    body := jsonb_build_object('record', row_to_json(NEW)::jsonb)
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'leads_dispatch_scored failed: %', SQLERRM;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_high_score_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'vault'
AS $function$
DECLARE sim_data jsonb; scor_val int; cron_secret text;
BEGIN
  sim_data := CASE WHEN NEW.simulation_data IS NOT NULL THEN NEW.simulation_data::jsonb ELSE NULL END;
  IF sim_data IS NULL THEN RETURN NEW; END IF;
  scor_val := COALESCE((sim_data->>'scor')::int, 0);
  IF scor_val >= 90 THEN
    SELECT decrypted_secret INTO cron_secret
    FROM vault.decrypted_secrets WHERE name = 'cron_reconcile_secret' LIMIT 1;
    PERFORM net.http_post(
      url := 'https://mvzssjyzbwccioqvhjpo.supabase.co/functions/v1/lead-webhook',
      headers := jsonb_build_object('Content-Type','application/json','x-cron-secret', coalesce(cron_secret,'')),
      body := jsonb_build_object('record', row_to_json(NEW)::jsonb)
    );
  END IF;
  RETURN NEW;
END; $function$;