
-- Register reconcile job in registry (idempotent)
INSERT INTO public.cron_job_registry (job_name, expected_interval_minutes, grace_minutes, is_active, description)
VALUES ('voice-agent-reconcile-5min', 5, 10, true, 'Reconcile stuck Twilio calls every 5 minutes')
ON CONFLICT (job_name) DO UPDATE SET
  expected_interval_minutes = EXCLUDED.expected_interval_minutes,
  grace_minutes = EXCLUDED.grace_minutes,
  is_active = true,
  description = EXCLUDED.description;

-- Notification trigger on cron_run_log failures
CREATE OR REPLACE FUNCTION public.notify_admins_on_cron_failure()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  admin_rec RECORD;
BEGIN
  -- Only act on terminal non-success states
  IF NEW.status IS NULL OR NEW.status IN ('success', 'started', 'running') THEN
    RETURN NEW;
  END IF;

  FOR admin_rec IN SELECT user_id FROM public.user_roles WHERE role = 'admin' LOOP
    INSERT INTO public.user_notifications (user_id, title, message, type, action_url, action_label)
    VALUES (
      admin_rec.user_id,
      '🚨 Cron eșuat: ' || NEW.job_name,
      'Execuție cu status "' || NEW.status || '"' ||
        CASE WHEN NEW.error_message IS NOT NULL THEN ' — ' || left(NEW.error_message, 200) ELSE '' END,
      'error',
      '/admin?tab=voice-agent',
      'Vezi Cron Monitor'
    );
  END LOOP;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admins_cron_failure ON public.cron_run_log;
CREATE TRIGGER trg_notify_admins_cron_failure
AFTER INSERT OR UPDATE OF status ON public.cron_run_log
FOR EACH ROW EXECUTE FUNCTION public.notify_admins_on_cron_failure();

-- Enable realtime
ALTER TABLE public.cron_run_log REPLICA IDENTITY FULL;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.cron_run_log;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
