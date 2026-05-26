CREATE TABLE IF NOT EXISTS public.marketing_snapshot (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  gsc_impressions INT NOT NULL DEFAULT 0,
  gsc_clicks INT NOT NULL DEFAULT 0,
  ga4_users INT NOT NULL DEFAULT 0,
  ad_spend_eur NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_snapshot TO authenticated;
GRANT ALL ON public.marketing_snapshot TO service_role;

ALTER TABLE public.marketing_snapshot ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view marketing_snapshot"
  ON public.marketing_snapshot FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage marketing_snapshot"
  ON public.marketing_snapshot FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_marketing_snapshot_date ON public.marketing_snapshot(date DESC);

CREATE TRIGGER update_marketing_snapshot_updated_at
  BEFORE UPDATE ON public.marketing_snapshot
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();