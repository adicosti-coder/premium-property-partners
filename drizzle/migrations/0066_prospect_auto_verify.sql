ALTER TABLE public.prospect_listings
  ADD COLUMN IF NOT EXISTS auto_verify_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS auto_verify_last_at timestamptz,
  ADD COLUMN IF NOT EXISTS auto_verify_status text,
  ADD COLUMN IF NOT EXISTS phone_source text;

CREATE TABLE IF NOT EXISTS public.prospect_auto_verify_state (
  id integer PRIMARY KEY DEFAULT 1,
  paused boolean NOT NULL DEFAULT false,
  pause_reason text,
  lease_until timestamptz,
  last_run_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT prospect_auto_verify_state_singleton CHECK (id = 1)
);

GRANT SELECT ON public.prospect_auto_verify_state TO authenticated;
GRANT ALL ON public.prospect_auto_verify_state TO service_role;

ALTER TABLE public.prospect_auto_verify_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read auto verify state" ON public.prospect_auto_verify_state;
CREATE POLICY "Admins read auto verify state"
ON public.prospect_auto_verify_state
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.prospect_auto_verify_state (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

SELECT cron.unschedule('prospect-auto-verify-hourly')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'prospect-auto-verify-hourly');

SELECT cron.schedule(
  'prospect-auto-verify-hourly',
  '25 7-20 * * *',
  $$
  SELECT net.http_post(
    url := 'https://mvzssjyzbwccioqvhjpo.supabase.co/functions/v1/prospect-auto-verify',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', public.get_cron_reconcile_secret()
    ),
    body := '{"limit":6,"source":"cron"}'::jsonb
  );
  $$
);