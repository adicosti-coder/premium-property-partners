-- Remove prior schedule if exists
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname='seo-audit-weekly') THEN
    PERFORM cron.unschedule('seo-audit-weekly');
  END IF;
END $$;

-- Schedule: every Monday at 06:00 UTC (≈ 08:00 Europe/Bucharest)
SELECT cron.schedule(
  'seo-audit-weekly',
  '0 6 * * 1',
  $cron$
  SELECT net.http_post(
    url := 'https://mvzssjyzbwccioqvhjpo.supabase.co/functions/v1/seo-audit-cron',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'Authorization','Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12enNzanl6YndjY2lvcXZoanBvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MjQxNjIsImV4cCI6MjA4MjAwMDE2Mn0.60JJMqMaDwIz1KXi3AZNqOd0lUU9pu2kqbg3Os3qbC8'
    ),
    body := jsonb_build_object('triggered_at', now()::text, 'source', 'pg_cron')
  );
  $cron$
);