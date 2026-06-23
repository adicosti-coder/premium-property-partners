CREATE TABLE public.prospect_scan_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','completed','failed','cancelled')),
  query_limit INTEGER NOT NULL DEFAULT 8,
  max_results INTEGER NOT NULL DEFAULT 10,
  only_new_sources BOOLEAN NOT NULL DEFAULT false,
  discovery_mode BOOLEAN NOT NULL DEFAULT false,
  custom_query TEXT,
  total_queries INTEGER NOT NULL DEFAULT 0,
  processed_queries INTEGER NOT NULL DEFAULT 0,
  current_keyword TEXT,
  current_platform TEXT,
  new_listings INTEGER NOT NULL DEFAULT 0,
  archived_skipped INTEGER NOT NULL DEFAULT 0,
  duplicate_skipped INTEGER NOT NULL DEFAULT 0,
  blacklisted_skipped INTEGER NOT NULL DEFAULT 0,
  errors JSONB NOT NULL DEFAULT '[]'::jsonb,
  result JSONB,
  error_message TEXT,
  triggered_by TEXT NOT NULL DEFAULT 'manual',
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.prospect_scan_jobs TO authenticated;
GRANT ALL ON public.prospect_scan_jobs TO service_role;

ALTER TABLE public.prospect_scan_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all scan jobs"
  ON public.prospect_scan_jobs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can create scan jobs"
  ON public.prospect_scan_jobs FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND created_by = auth.uid());

CREATE POLICY "Admins can update scan jobs"
  ON public.prospect_scan_jobs FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_prospect_scan_jobs_status ON public.prospect_scan_jobs(status, created_at DESC);
CREATE INDEX idx_prospect_scan_jobs_created_by ON public.prospect_scan_jobs(created_by, created_at DESC);

CREATE TRIGGER trg_prospect_scan_jobs_updated
  BEFORE UPDATE ON public.prospect_scan_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.prospect_scan_jobs;