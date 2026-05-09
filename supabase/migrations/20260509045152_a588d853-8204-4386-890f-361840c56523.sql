
-- Single-row config table
CREATE TABLE IF NOT EXISTS public.system_health_thresholds (
  id BOOLEAN PRIMARY KEY DEFAULT true CHECK (id = true),
  voice_latency_ms_threshold INTEGER NOT NULL DEFAULT 1500,
  voice_streak_required INTEGER NOT NULL DEFAULT 3,
  seo_reaudit_interval_days INTEGER NOT NULL DEFAULT 7,
  key_expiry_warn_days INTEGER NOT NULL DEFAULT 14,
  cron_grace_minutes INTEGER NOT NULL DEFAULT 15,
  daily_report_enabled BOOLEAN NOT NULL DEFAULT true,
  daily_report_email TEXT NOT NULL DEFAULT 'adicosti@gmail.com',
  e2e_seo_url TEXT NOT NULL DEFAULT 'https://www.realtrust.ro/',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);

INSERT INTO public.system_health_thresholds (id) VALUES (true) ON CONFLICT DO NOTHING;

ALTER TABLE public.system_health_thresholds ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read thresholds" ON public.system_health_thresholds;
CREATE POLICY "Admins read thresholds" ON public.system_health_thresholds
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Admins update thresholds" ON public.system_health_thresholds;
CREATE POLICY "Admins update thresholds" ON public.system_health_thresholds
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Audit trigger reuse
DROP TRIGGER IF EXISTS trg_audit_system_health_thresholds ON public.system_health_thresholds;
CREATE TRIGGER trg_audit_system_health_thresholds
  AFTER UPDATE ON public.system_health_thresholds
  FOR EACH ROW EXECUTE FUNCTION public.audit_settings_change();

-- E2E runs
CREATE TABLE IF NOT EXISTS public.e2e_test_runs (
  id BIGSERIAL PRIMARY KEY,
  run_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  test_type TEXT NOT NULL CHECK (test_type IN ('voice','seo','combined')),
  status TEXT NOT NULL CHECK (status IN ('passed','failed','critical')),
  duration_ms INTEGER,
  details JSONB DEFAULT '{}'::jsonb,
  error_message TEXT
);
CREATE INDEX IF NOT EXISTS idx_e2e_runs_time ON public.e2e_test_runs (run_at DESC);
ALTER TABLE public.e2e_test_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read e2e_test_runs" ON public.e2e_test_runs;
CREATE POLICY "Admins read e2e_test_runs" ON public.e2e_test_runs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- Add new cron jobs to registry
INSERT INTO public.cron_job_registry (job_name, expected_interval_minutes, grace_minutes, description) VALUES
  ('system-e2e-tests', 1440, 60, 'Daily E2E voice+SEO tests'),
  ('system-health-report', 1440, 120, 'Daily 09:00 status email report')
ON CONFLICT (job_name) DO NOTHING;
