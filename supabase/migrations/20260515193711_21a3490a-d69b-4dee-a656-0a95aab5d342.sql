-- ============================================
-- AUTOMATION INFRASTRUCTURE (Iter 1)
-- ============================================

-- 1. Singleton settings (kill switch global)
CREATE TABLE public.automation_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  enabled boolean NOT NULL DEFAULT false,
  paused_reason text,
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.automation_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read automation settings"
  ON public.automation_settings FOR SELECT
  TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update automation settings"
  ON public.automation_settings FOR UPDATE
  TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert automation settings"
  ON public.automation_settings FOR INSERT
  TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.automation_settings (id, enabled) VALUES (true, false);

-- 2. Job registry
CREATE TABLE public.automation_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_key text UNIQUE NOT NULL,
  category text NOT NULL CHECK (category IN ('lead', 'seo', 'system')),
  label text NOT NULL,
  description text,
  enabled boolean NOT NULL DEFAULT false,
  schedule text,
  trigger_type text NOT NULL DEFAULT 'cron' CHECK (trigger_type IN ('cron', 'event', 'manual')),
  last_run_at timestamptz,
  last_status text CHECK (last_status IN ('success', 'failed', 'disabled', 'running')),
  last_error text,
  consecutive_failures int NOT NULL DEFAULT 0,
  total_runs bigint NOT NULL DEFAULT 0,
  total_successes bigint NOT NULL DEFAULT 0,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.automation_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read automation jobs"
  ON public.automation_jobs FOR SELECT
  TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins write automation jobs"
  ON public.automation_jobs FOR ALL
  TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_automation_jobs_updated
  BEFORE UPDATE ON public.automation_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_automation_jobs_category ON public.automation_jobs(category);
CREATE INDEX idx_automation_jobs_enabled ON public.automation_jobs(enabled);

-- 3. Approvals queue
CREATE TABLE public.automation_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_key text NOT NULL,
  action_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  proposal jsonb NOT NULL DEFAULT '{}'::jsonb,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  rejected_reason text,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.automation_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read automation approvals"
  ON public.automation_approvals FOR SELECT
  TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins write automation approvals"
  ON public.automation_approvals FOR ALL
  TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_automation_approvals_status ON public.automation_approvals(status, created_at DESC);
CREATE INDEX idx_automation_approvals_job ON public.automation_approvals(job_key);

-- 4. Anomalies log
CREATE TABLE public.automation_anomalies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric text NOT NULL,
  baseline numeric,
  observed numeric,
  delta_pct numeric,
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  notified boolean NOT NULL DEFAULT false,
  acknowledged_by uuid REFERENCES auth.users(id),
  acknowledged_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.automation_anomalies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read automation anomalies"
  ON public.automation_anomalies FOR SELECT
  TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins write automation anomalies"
  ON public.automation_anomalies FOR ALL
  TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_automation_anomalies_created ON public.automation_anomalies(created_at DESC);
CREATE INDEX idx_automation_anomalies_severity ON public.automation_anomalies(severity);

-- 5. Audit trigger on settings change
CREATE TRIGGER trg_automation_settings_audit
  AFTER UPDATE ON public.automation_settings
  FOR EACH ROW EXECUTE FUNCTION public.audit_settings_change();

CREATE TRIGGER trg_automation_jobs_audit
  AFTER UPDATE ON public.automation_jobs
  FOR EACH ROW EXECUTE FUNCTION public.audit_settings_change();

-- 6. Seed initial jobs (all DISABLED until activated per iteration)
INSERT INTO public.automation_jobs (job_key, category, label, description, schedule, trigger_type, enabled) VALUES
  -- LEAD PIPELINE
  ('lead.auto_classify_agency',  'lead', 'Auto-clasificare agenții (Gemini)',     'Scoreaz fiecare prospect nou cu Gemini și flag-ează agențiile suspecte (≥85 → propunere blacklist)', 'event-driven', 'event', false),
  ('lead.auto_dedup',            'lead', 'Auto-dedup cross-platform',              'Skip prospect dacă (telefon+zonă+camere+suprafață) există în ultimele 30 zile pe orice sursă',          'event-driven', 'event', false),
  ('lead.auto_twilio_lookup',    'lead', 'Auto Twilio Lookup',                     'Verifică line_type pentru telefoane noi; landline/voip → do_not_call=true',                          'event-driven', 'event', false),
  ('lead.auto_archive_callers',  'lead', 'Arhivează profile de apel inactive',     'Profile fără apel de 6+ luni sunt arhivate automat',                                                  '0 3 * * *',     'cron',  false),
  ('lead.auto_recall_no_answer', 'lead', 'Auto-recall după no-answer',             'Reprogramează apel după 4h, max 2 retries; al 3-lea no-answer → marcat cold',                         'event-driven', 'event', false),
  ('lead.auto_call_rate_limit',  'lead', 'Rate-limit auto-dial (5/h)',             'Maxim 5 apeluri auto pe oră ca să nu suprasolicităm Voice Agent',                                     'event-driven', 'event', false),
  -- SEO
  ('seo.auto_audit_on_update',   'seo',  'Auto-audit URL la modificare conținut',  'La update properties/blog/complex → Gemini scor + sugestii salvate în cache',                         'event-driven', 'event', false),
  ('seo.auto_indexnow_push',     'seo',  'Auto-push IndexNow',                     'Notifică motoarele de căutare la fiecare modificare de conținut indexabil',                            'event-driven', 'event', false),
  ('seo.auto_fill_meta',         'seo',  'Auto-fill meta lipsă (draft)',           'Generează draft meta_title/meta_description cu Gemini → status pending_review',                       '0 4 * * *',     'cron',  false),
  ('seo.canonical_conflict_scan','seo',  'Scan conflicte canonical săptămânal',    'Verifică sitemap-ul: canonical curat, fără slash, fără query',                                        '0 0 * * 0',     'cron',  false),
  ('seo.weekly_report',          'seo',  'Raport SEO săptămânal',                  'Email luni 09:00 cu poziții, top pagini, recomandări AI',                                             '0 9 * * 1',     'cron',  false),
  ('seo.anomaly_detector',       'seo',  'Detector anomalii SEO (drop > 15%)',     'Compară Semrush week-over-week și raportează căderi mari',                                            '0 10 * * *',    'cron',  false),
  -- SYSTEM
  ('system.daily_digest',        'system','Digest zilnic Admin (08:00)',           'Email + WhatsApp cu KPI lead-uri, apeluri, anomalii, costuri',                                        '0 8 * * *',     'cron',  false),
  ('system.self_healing',        'system','Self-healing cron (retry exponential)', 'Retry job-uri eșuate (1m → 5m → 15m); după 3 eșecuri auto-disable + alert',                          '*/5 * * * *',   'cron',  false),
  ('system.orchestrator',        'system','Automation Orchestrator (5 min)',       'Dispatcher principal — rulează la fiecare 5 minute job-urile event-driven datorate',                  '*/5 * * * *',   'cron',  false);