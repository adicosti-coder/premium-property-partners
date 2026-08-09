CREATE TABLE public.conversion_test_runs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_name text NOT NULL,
  event_id text NOT NULL,
  dry_run boolean NOT NULL DEFAULT true,
  datalayer_fired boolean NOT NULL DEFAULT false,
  ga4_fired boolean NOT NULL DEFAULT false,
  capi_http_status integer,
  capi_event_id text,
  event_id_matched boolean NOT NULL DEFAULT false,
  hashed_fields text[] NOT NULL DEFAULT '{}',
  capi_response jsonb,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.conversion_test_runs TO authenticated;
GRANT ALL ON public.conversion_test_runs TO service_role;

ALTER TABLE public.conversion_test_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view conversion test runs"
ON public.conversion_test_runs FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can create conversion test runs"
ON public.conversion_test_runs FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') AND created_by = auth.uid());

CREATE POLICY "Admins can delete conversion test runs"
ON public.conversion_test_runs FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_conversion_test_runs_created_at ON public.conversion_test_runs (created_at DESC);