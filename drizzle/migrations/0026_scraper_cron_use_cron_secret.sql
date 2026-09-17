-- The scraper cron jobs used a hardcoded bearer that became invalid after key
-- rotation, so every scheduled call returned 401 and no scan ran. Reschedule them
-- through the existing helper that supplies the internal cron secret.

SELECT cron.unschedule('scrape-prospects-4xday');
SELECT cron.unschedule('keyword-radar-scan-2xday');
SELECT cron.unschedule('keyword-radar-discover-2xday');

CREATE OR REPLACE FUNCTION public.run_scraper_cron(_fn text, _body jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://mvzssjyzbwccioqvhjpo.supabase.co/functions/v1/' || _fn,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', public.get_cron_reconcile_secret()
    ),
    body := _body,
    timeout_milliseconds := 120000
  );
END;
$$;

REVOKE ALL ON FUNCTION public.run_scraper_cron(text, jsonb) FROM PUBLIC;

SELECT cron.schedule('scrape-prospects-4xday', '0 4,10,16,20 * * *',
  $$SELECT public.run_scraper_cron('scrape-prospects', '{"triggered_by":"cron","max_results":15}'::jsonb)$$);

SELECT cron.schedule('keyword-radar-discover-2xday', '0 3,15 * * *',
  $$SELECT public.run_scraper_cron('keyword-radar-discover', '{"triggered_by":"cron"}'::jsonb)$$);

SELECT cron.schedule('keyword-radar-scan-2xday', '10 3,15 * * *',
  $$SELECT public.run_scraper_cron('keyword-radar-scan', '{"triggered_by":"cron","limit":25,"stale_hours":12}'::jsonb)$$);