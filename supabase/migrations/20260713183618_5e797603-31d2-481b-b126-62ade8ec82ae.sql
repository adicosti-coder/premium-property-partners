CREATE TABLE IF NOT EXISTS public.frontend_error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  correlation_id text NOT NULL,
  scope text NOT NULL,
  level text NOT NULL DEFAULT 'error',
  route text,
  message text NOT NULL,
  user_agent text,
  meta jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS frontend_error_logs_scope_created_idx
  ON public.frontend_error_logs (scope, created_at DESC);
CREATE INDEX IF NOT EXISTS frontend_error_logs_corr_idx
  ON public.frontend_error_logs (correlation_id);

GRANT INSERT ON public.frontend_error_logs TO anon, authenticated;
GRANT SELECT, DELETE ON public.frontend_error_logs TO authenticated;
GRANT ALL ON public.frontend_error_logs TO service_role;

ALTER TABLE public.frontend_error_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert frontend errors"
  ON public.frontend_error_logs FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can read frontend errors"
  ON public.frontend_error_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can delete frontend errors"
  ON public.frontend_error_logs FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));