
-- =========================================================================
-- AUTOPILOT & SECURITY MAINTENANCE SYSTEM
-- =========================================================================

-- 1) CRON RUN LOG ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cron_run_log (
  id BIGSERIAL PRIMARY KEY,
  job_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('started','success','failed','skipped')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  duration_ms INTEGER,
  details JSONB DEFAULT '{}'::jsonb,
  error_message TEXT
);
CREATE INDEX IF NOT EXISTS idx_cron_run_log_job_time ON public.cron_run_log (job_name, started_at DESC);
ALTER TABLE public.cron_run_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read cron_run_log" ON public.cron_run_log;
CREATE POLICY "Admins read cron_run_log" ON public.cron_run_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- Expected cron jobs registry (job_name + max gap allowed in minutes)
CREATE TABLE IF NOT EXISTS public.cron_job_registry (
  job_name TEXT PRIMARY KEY,
  expected_interval_minutes INTEGER NOT NULL,
  grace_minutes INTEGER NOT NULL DEFAULT 15,
  is_active BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  last_alert_at TIMESTAMPTZ
);
ALTER TABLE public.cron_job_registry ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage cron_job_registry" ON public.cron_job_registry;
CREATE POLICY "Admins manage cron_job_registry" ON public.cron_job_registry
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Seed known cron jobs
INSERT INTO public.cron_job_registry (job_name, expected_interval_minutes, grace_minutes, description) VALUES
  ('seo-audit-cron', 10080, 120, 'Weekly SEO audit (Mon 08:00)'),
  ('seo-competitor-cron', 1440, 60, 'Daily competitor snapshots'),
  ('ga4-analytics-import', 1440, 120, 'Daily GA4 metrics import'),
  ('cleanup_old_tracking_data', 10080, 1440, 'Weekly tracking data cleanup'),
  ('voice-agent-autopilot', 60, 30, 'Hourly voice agent autopilot'),
  ('voice-latency-monitor', 30, 15, 'Voice agent latency watchdog'),
  ('external-keys-healthcheck', 1440, 120, 'Daily Google SA + ElevenLabs key validity'),
  ('cron-health-monitor', 30, 15, 'Self-check for missed cron jobs')
ON CONFLICT (job_name) DO NOTHING;

-- Helper: log a cron run (used from edge fns)
CREATE OR REPLACE FUNCTION public.log_cron_run(
  p_job TEXT, p_status TEXT, p_duration_ms INT DEFAULT NULL,
  p_details JSONB DEFAULT '{}'::jsonb, p_error TEXT DEFAULT NULL
) RETURNS BIGINT
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_id BIGINT;
BEGIN
  INSERT INTO public.cron_run_log (job_name, status, finished_at, duration_ms, details, error_message)
  VALUES (p_job, p_status, CASE WHEN p_status<>'started' THEN now() END, p_duration_ms, COALESCE(p_details,'{}'::jsonb), p_error)
  RETURNING id INTO v_id;
  RETURN v_id;
END$$;

-- 2) SECURITY AUDIT TRIGGERS for sensitive settings -----------------------
CREATE OR REPLACE FUNCTION public.audit_settings_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  INSERT INTO public.admin_audit_log (action, actor_user_id, actor_label, entity_type, entity_id, details, severity)
  VALUES (
    TG_OP || '_' || TG_TABLE_NAME,
    auth.uid(),
    COALESCE((SELECT email FROM public.profiles WHERE id = auth.uid()), 'system'),
    TG_TABLE_NAME,
    COALESCE((CASE WHEN TG_OP='DELETE' THEN OLD.id::text ELSE NEW.id::text END), 'n/a'),
    jsonb_build_object(
      'old', CASE WHEN TG_OP='INSERT' THEN NULL ELSE to_jsonb(OLD) END,
      'new', CASE WHEN TG_OP='DELETE' THEN NULL ELSE to_jsonb(NEW) END,
      'op', TG_OP
    ),
    'info'
  );
  RETURN COALESCE(NEW, OLD);
EXCEPTION WHEN OTHERS THEN
  RETURN COALESCE(NEW, OLD);
END$$;

DROP TRIGGER IF EXISTS trg_audit_voice_agent_settings ON public.voice_agent_settings;
CREATE TRIGGER trg_audit_voice_agent_settings
  AFTER INSERT OR UPDATE OR DELETE ON public.voice_agent_settings
  FOR EACH ROW EXECUTE FUNCTION public.audit_settings_change();

DROP TRIGGER IF EXISTS trg_audit_voice_agent_scripts ON public.voice_agent_scripts;
CREATE TRIGGER trg_audit_voice_agent_scripts
  AFTER INSERT OR UPDATE OR DELETE ON public.voice_agent_scripts
  FOR EACH ROW EXECUTE FUNCTION public.audit_settings_change();

DROP TRIGGER IF EXISTS trg_audit_seo_settings ON public.seo_settings;
CREATE TRIGGER trg_audit_seo_settings
  AFTER INSERT OR UPDATE OR DELETE ON public.seo_settings
  FOR EACH ROW EXECUTE FUNCTION public.audit_settings_change();

-- 3) Voice latency alert tracker
CREATE TABLE IF NOT EXISTS public.voice_latency_alerts (
  id BIGSERIAL PRIMARY KEY,
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  avg_latency_ms INTEGER NOT NULL,
  consecutive_calls INTEGER NOT NULL,
  call_session_ids UUID[] DEFAULT '{}'::uuid[],
  details JSONB DEFAULT '{}'::jsonb,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID
);
ALTER TABLE public.voice_latency_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read voice_latency_alerts" ON public.voice_latency_alerts;
CREATE POLICY "Admins read voice_latency_alerts" ON public.voice_latency_alerts
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Admins ack voice_latency_alerts" ON public.voice_latency_alerts;
CREATE POLICY "Admins ack voice_latency_alerts" ON public.voice_latency_alerts
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 4) External keys health
CREATE TABLE IF NOT EXISTS public.external_keys_health (
  id BIGSERIAL PRIMARY KEY,
  provider TEXT NOT NULL,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_valid BOOLEAN NOT NULL,
  status_code INTEGER,
  message TEXT,
  details JSONB DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_ext_keys_provider_time ON public.external_keys_health (provider, checked_at DESC);
ALTER TABLE public.external_keys_health ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read external_keys_health" ON public.external_keys_health;
CREATE POLICY "Admins read external_keys_health" ON public.external_keys_health
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
