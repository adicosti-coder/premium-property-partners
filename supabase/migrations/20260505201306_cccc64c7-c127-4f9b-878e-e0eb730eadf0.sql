
ALTER TABLE public.voice_agent_settings
  ADD COLUMN IF NOT EXISTS autopilot_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS autopilot_mode text NOT NULL DEFAULT 'safety_net',
  ADD COLUMN IF NOT EXISTS autopilot_max_per_tick int NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS autopilot_retention_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS autopilot_followup_auto_approve boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS autopilot_followup_min_sentiment text NOT NULL DEFAULT 'neutral',
  ADD COLUMN IF NOT EXISTS autopilot_last_tick_at timestamptz;

CREATE TABLE IF NOT EXISTS public.voice_autonomy_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  source text NOT NULL DEFAULT 'cron',
  prospects_ingested int NOT NULL DEFAULT 0,
  retention_ingested int NOT NULL DEFAULT 0,
  calls_initiated int NOT NULL DEFAULT 0,
  followups_auto_approved int NOT NULL DEFAULT 0,
  followups_pending_review int NOT NULL DEFAULT 0,
  drills_executed int NOT NULL DEFAULT 0,
  ab_tests_evaluated int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'running',
  error text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.voice_autonomy_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_view_autonomy_runs" ON public.voice_autonomy_runs;
CREATE POLICY "admins_view_autonomy_runs" ON public.voice_autonomy_runs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "service_role_writes_autonomy_runs" ON public.voice_autonomy_runs;
CREATE POLICY "service_role_writes_autonomy_runs" ON public.voice_autonomy_runs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_voice_autonomy_runs_started ON public.voice_autonomy_runs(started_at DESC);
