-- Self-healing config + live logs

ALTER TABLE public.automation_settings
  ADD COLUMN IF NOT EXISTS self_healing_config jsonb NOT NULL DEFAULT jsonb_build_object(
    'failure_disable_threshold', 5,
    'timeout_bump_ratio', 1.25,
    'timeout_ceiling_ms', 120000,
    'default_timeout_ms', 50000,
    'success_rate_low', 0.5,
    'success_rate_high', 0.9,
    'recent_runs_window', 20,
    'stale_threshold_minutes', 120,
    'retention_days', 30
  );

-- Live logs table for streaming events from orchestrator + self-healing
CREATE TABLE IF NOT EXISTS public.automation_live_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  level text NOT NULL DEFAULT 'info',
  job_key text,
  message text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_automation_live_logs_created_at
  ON public.automation_live_logs (created_at DESC);

ALTER TABLE public.automation_live_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read live logs" ON public.automation_live_logs;
CREATE POLICY "Admins read live logs"
  ON public.automation_live_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.automation_live_logs;
ALTER TABLE public.automation_live_logs REPLICA IDENTITY FULL;

-- Cleanup helper (best effort)
CREATE OR REPLACE FUNCTION public.automation_live_logs_cleanup(_keep_hours integer DEFAULT 48)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE deleted integer;
BEGIN
  DELETE FROM public.automation_live_logs
   WHERE created_at < now() - make_interval(hours => _keep_hours);
  GET DIAGNOSTICS deleted = ROW_COUNT;
  RETURN deleted;
END $$;