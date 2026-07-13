DROP POLICY IF EXISTS "Anyone can insert frontend errors" ON public.frontend_error_logs;

CREATE POLICY "Anyone can insert bounded frontend errors"
  ON public.frontend_error_logs FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    scope IS NOT NULL
    AND length(scope) BETWEEN 1 AND 100
    AND message IS NOT NULL
    AND length(message) BETWEEN 1 AND 2000
    AND (route IS NULL OR length(route) <= 500)
    AND (user_agent IS NULL OR length(user_agent) <= 500)
    AND (level IS NULL OR level IN ('error', 'warning', 'info'))
    AND (correlation_id IS NULL OR length(correlation_id) <= 100)
  );