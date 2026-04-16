
-- Schedule auto-dial cron every 15 minutes
SELECT cron.schedule(
  'voice-agent-auto-dial',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://mvzssjyzbwccioqvhjpo.supabase.co/functions/v1/voice-agent-auto-dial',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
  $$
);
