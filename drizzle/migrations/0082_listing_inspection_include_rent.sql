CREATE OR REPLACE FUNCTION public.fire_listing_inspection()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE secret text;
BEGIN
  IF lower(coalesce(NEW.category::text, '')) NOT IN ('vanzare','inchiriere') THEN RETURN NEW; END IF;
  IF coalesce(NEW.title, '') = '' AND coalesce(NEW.description, '') = '' THEN RETURN NEW; END IF;
  BEGIN secret := public.get_cron_reconcile_secret(); EXCEPTION WHEN OTHERS THEN secret := NULL; END;
  IF secret IS NULL OR secret = '' THEN RETURN NEW; END IF;
  PERFORM net.http_post(
    url := 'https://mvzssjyzbwccioqvhjpo.supabase.co/functions/v1/listing-inspection-dispatch',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', secret),
    body := jsonb_build_object('prospect_id', NEW.id)
  );
  RETURN NEW;
END $function$;