SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'ga4-analytics-import-daily';

SELECT cron.schedule(
  'ga4-analytics-import-daily',
  '0 4 * * *',
  $$SELECT net.http_post(
    url := 'https://mvzssjyzbwccioqvhjpo.supabase.co/functions/v1/ga4-analytics-import',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer REDACTED-superseded-by-x-cron-secret"}'::jsonb,
    body := '{"days":30}'::jsonb
  ) AS request_id;$$
);