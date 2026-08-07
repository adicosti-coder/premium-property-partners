CREATE OR REPLACE FUNCTION public.notify_new_lead_whatsapp()
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
    url := 'https://mvzssjyzbwccioqvhjpo.supabase.co/functions/v1/notify-new-lead-whatsapp',
    headers := jsonb_build_object('Content-Type','application/json','x-cron-secret', coalesce(cron_secret,'')),
    body := jsonb_build_object('record', row_to_json(NEW)::jsonb)
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_new_lead_whatsapp failed: %', SQLERRM;
  RETURN NEW;
END; $function$;