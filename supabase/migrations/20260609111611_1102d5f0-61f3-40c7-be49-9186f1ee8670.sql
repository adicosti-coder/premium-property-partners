SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'ga4-analytics-import-daily';

SELECT cron.schedule(
  'ga4-analytics-import-daily',
  '0 4 * * *',
  $$SELECT net.http_post(
    url := 'https://mvzssjyzbwccioqvhjpo.supabase.co/functions/v1/ga4-analytics-import',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12enNzanl6YndjY2lvcXZoanBvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjQyNDE2MiwiZXhwIjoyMDgyMDAwMTYyfQ.aD7azlzg9NlqkR-hOC1bnnUyKqj3MqXIWqRAegoSL5w"}'::jsonb,
    body := '{"days":30}'::jsonb
  ) AS request_id;$$
);