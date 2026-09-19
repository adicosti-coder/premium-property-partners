-- Zone preferate pentru căutarea de anunțuri de la proprietari
CREATE TABLE IF NOT EXISTS public.admin_preferred_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_preferred_zones_zone
  ON public.admin_preferred_zones (lower(zone));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_preferred_zones TO authenticated;
GRANT ALL ON public.admin_preferred_zones TO service_role;

ALTER TABLE public.admin_preferred_zones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage preferred zones" ON public.admin_preferred_zones;
CREATE POLICY "Admins manage preferred zones"
  ON public.admin_preferred_zones
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Zone implicite (Timișoara)
INSERT INTO public.admin_preferred_zones (zone)
SELECT z FROM (VALUES
  ('Calea Lipovei'), ('Aradului'), ('Torontalului'), ('Circumvalațiunii'),
  ('Dumbrăvița'), ('Girocului'), ('Cetate'), ('Iosefin'), ('Fabric')
) AS v(z)
WHERE NOT EXISTS (
  SELECT 1 FROM public.admin_preferred_zones p WHERE lower(p.zone) = lower(v.z)
);

-- Reverificare automată a anunțurilor (marchează „Anunț expirat")
SELECT cron.unschedule('prospect-expiry-check-daily')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'prospect-expiry-check-daily');

SELECT cron.schedule(
  'prospect-expiry-check-daily',
  '40 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://mvzssjyzbwccioqvhjpo.supabase.co/functions/v1/prospect-expiry-check',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', public.get_cron_reconcile_secret()
    ),
    body := '{"mode":"batch","limit":80}'::jsonb
  );
  $$
);
