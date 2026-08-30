CREATE TABLE IF NOT EXISTS public.seo_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text NOT NULL,
  alert_key text NOT NULL,
  title text NOT NULL,
  severity text NOT NULL DEFAULT 'warning',
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  notified_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS seo_alerts_created_idx ON public.seo_alerts (created_at DESC);
CREATE INDEX IF NOT EXISTS seo_alerts_key_idx ON public.seo_alerts (alert_type, alert_key, created_at DESC);

GRANT SELECT, UPDATE, DELETE ON public.seo_alerts TO authenticated;
GRANT ALL ON public.seo_alerts TO service_role;

ALTER TABLE public.seo_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read seo alerts" ON public.seo_alerts;
CREATE POLICY "Admins can read seo alerts" ON public.seo_alerts
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update seo alerts" ON public.seo_alerts;
CREATE POLICY "Admins can update seo alerts" ON public.seo_alerts
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete seo alerts" ON public.seo_alerts;
CREATE POLICY "Admins can delete seo alerts" ON public.seo_alerts
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));