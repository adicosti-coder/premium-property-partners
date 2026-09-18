SELECT cron.unschedule('prospect-new-listings-alert-hourly')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'prospect-new-listings-alert-hourly');

SELECT cron.schedule(
  'prospect-new-listings-alert-hourly',
  '10 6-17 * * 1-6',
  $$
  SELECT net.http_post(
    url := 'https://mvzssjyzbwccioqvhjpo.supabase.co/functions/v1/prospect-new-listings-alert',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', public.get_cron_reconcile_secret()
    ),
    body := '{"source":"cron"}'::jsonb
  );
  $$
);