ALTER TABLE public.seo_alerts ADD COLUMN IF NOT EXISTS webhook_sent_at timestamptz;

SELECT cron.unschedule('sitemap-auto-rebuild-daily')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sitemap-auto-rebuild-daily');

SELECT cron.schedule(
  'sitemap-auto-rebuild-daily',
  '20 4 * * *',
  $$
  SELECT net.http_post(
    url := 'https://mvzssjyzbwccioqvhjpo.supabase.co/functions/v1/purge-sitemap-cache',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', public.get_cron_reconcile_secret()
    ),
    body := '{}'::jsonb
  );
  $$
);