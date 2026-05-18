
-- 1) retry tracking
ALTER TABLE public.automation_runs
  ADD COLUMN IF NOT EXISTS retry_count integer NOT NULL DEFAULT 0;

-- 2) realtime
ALTER TABLE public.automation_runs REPLICA IDENTITY FULL;
ALTER TABLE public.automation_jobs REPLICA IDENTITY FULL;
ALTER TABLE public.automation_anomalies REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='automation_runs'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.automation_runs';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='automation_jobs'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.automation_jobs';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='automation_anomalies'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.automation_anomalies';
  END IF;
END $$;

-- 3) register anomaly notifier job
INSERT INTO public.automation_jobs (job_key, category, label, description, enabled, schedule, trigger_type, config)
VALUES (
  'system.anomaly_notifier',
  'system',
  'Notificator anomalii (email)',
  'La fiecare 15 minute trimite email admin cu anomaliile noi apărute în automation_anomalies (notified=false). Marchează-le ca trimise.',
  true,
  '*/15 * * * *',
  'cron',
  '{"timeout_ms": 30000, "max_retries": 1}'::jsonb
)
ON CONFLICT (job_key) DO UPDATE
  SET label = EXCLUDED.label,
      description = EXCLUDED.description,
      schedule = EXCLUDED.schedule,
      config = EXCLUDED.config;
