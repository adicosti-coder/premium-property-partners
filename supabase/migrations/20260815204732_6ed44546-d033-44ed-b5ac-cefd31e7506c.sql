ALTER TABLE public.chatbot_appointments
  ADD COLUMN IF NOT EXISTS confirmation_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_chatbot_appointments_reminder
  ON public.chatbot_appointments (preferred_date)
  WHERE reminder_sent_at IS NULL;

SELECT cron.unschedule('send-call-reminders-15min')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send-call-reminders-15min');

SELECT cron.schedule(
  'send-call-reminders-15min',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://mvzssjyzbwccioqvhjpo.supabase.co/functions/v1/send-call-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', public.get_cron_reconcile_secret()
    ),
    body := '{}'::jsonb
  );
  $$
);