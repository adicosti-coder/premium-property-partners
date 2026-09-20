CREATE TABLE IF NOT EXISTS public.scraper_health_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  target text NOT NULL,
  severity text NOT NULL DEFAULT 'warning',
  status text NOT NULL DEFAULT 'open',
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  remediation text,
  occurrences integer NOT NULL DEFAULT 1,
  opened_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  alerted_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_scraper_health_open_unique
  ON public.scraper_health_incidents (kind, target) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_scraper_health_recent
  ON public.scraper_health_incidents (status, last_seen_at DESC);

GRANT SELECT ON public.scraper_health_incidents TO authenticated;
GRANT ALL ON public.scraper_health_incidents TO service_role;
ALTER TABLE public.scraper_health_incidents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read scraper health incidents" ON public.scraper_health_incidents;
CREATE POLICY "Admins read scraper health incidents"
  ON public.scraper_health_incidents FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.scraper_platform_health (
  platform text PRIMARY KEY,
  consecutive_blocked integer NOT NULL DEFAULT 0,
  consecutive_zero integer NOT NULL DEFAULT 0,
  last_ok_at timestamptz,
  last_blocked_at timestamptz,
  cooldown_until timestamptz,
  auto_disabled boolean NOT NULL DEFAULT false,
  last_reason text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.scraper_platform_health TO authenticated;
GRANT ALL ON public.scraper_platform_health TO service_role;
ALTER TABLE public.scraper_platform_health ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read scraper platform health" ON public.scraper_platform_health;
CREATE POLICY "Admins read scraper platform health"
  ON public.scraper_platform_health FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.automation_jobs (job_key, category, label, description, enabled, schedule, trigger_type, config)
VALUES (
  'scraper.health_monitor', 'listing', 'Monitor blocaje scraper',
  'Detectează scanări blocate, portaluri anti-bot și cuvinte cheie fără rezultate; aplică remedieri automate.',
  true, '*/15 * * * *', 'cron', '{}'::jsonb
)
ON CONFLICT (job_key) DO UPDATE
  SET label = EXCLUDED.label, description = EXCLUDED.description, schedule = EXCLUDED.schedule, enabled = true;