-- Schedules table for periodic competitor monitoring
CREATE TABLE IF NOT EXISTS public.seo_competitor_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  our_url_path text NOT NULL,
  competitor_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  frequency text NOT NULL DEFAULT 'weekly' CHECK (frequency IN ('daily','weekly','monthly')),
  is_active boolean NOT NULL DEFAULT true,
  last_run_at timestamptz,
  next_run_at timestamptz NOT NULL DEFAULT now(),
  last_run_status text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_seo_competitor_schedules_next_run
  ON public.seo_competitor_schedules (next_run_at) WHERE is_active = true;

ALTER TABLE public.seo_competitor_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage competitor schedules"
  ON public.seo_competitor_schedules
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER trg_seo_competitor_schedules_updated
  BEFORE UPDATE ON public.seo_competitor_schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();