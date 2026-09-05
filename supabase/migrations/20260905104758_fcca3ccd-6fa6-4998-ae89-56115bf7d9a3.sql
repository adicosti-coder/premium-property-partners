CREATE TABLE IF NOT EXISTS public.email_domain_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checked_at timestamptz NOT NULL DEFAULT now(),
  domain text NOT NULL,
  dns_healthy boolean NOT NULL DEFAULT false,
  delegation_serving boolean NOT NULL DEFAULT false,
  delegation_note text,
  pending_emails integer NOT NULL DEFAULT 0,
  auto_retried integer NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'admin',
  details jsonb
);

CREATE INDEX IF NOT EXISTS idx_email_domain_checks_checked_at
  ON public.email_domain_checks (checked_at DESC);

GRANT SELECT ON public.email_domain_checks TO authenticated;
GRANT ALL ON public.email_domain_checks TO service_role;

ALTER TABLE public.email_domain_checks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read email domain checks" ON public.email_domain_checks;
CREATE POLICY "Admins can read email domain checks"
  ON public.email_domain_checks
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

SELECT cron.unschedule('email-domain-health-daily')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'email-domain-health-daily');

SELECT cron.schedule(
  'email-domain-health-daily',
  '20 6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://mvzssjyzbwccioqvhjpo.supabase.co/functions/v1/email-domain-health',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', public.get_cron_reconcile_secret()
    ),
    body := '{"action":"status"}'::jsonb
  );
  $$
);