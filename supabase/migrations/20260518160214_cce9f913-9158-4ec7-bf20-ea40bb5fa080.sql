
-- Tabela de istoric per-rulaj
CREATE TABLE IF NOT EXISTS public.automation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_key text NOT NULL REFERENCES public.automation_jobs(job_key) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  duration_ms integer,
  status text NOT NULL CHECK (status IN ('success','failed','timeout','skipped','running')),
  error text,
  triggered_by text,
  output_summary jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_automation_runs_job_started
  ON public.automation_runs (job_key, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_automation_runs_started
  ON public.automation_runs (started_at DESC);

ALTER TABLE public.automation_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read automation runs" ON public.automation_runs;
CREATE POLICY "Admins can read automation runs"
  ON public.automation_runs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Funcție actualizată: scrie și în automation_runs
CREATE OR REPLACE FUNCTION public.automation_complete_run(
  _job_key text,
  _success boolean,
  _error text DEFAULT NULL,
  _payload jsonb DEFAULT '{}'::jsonb,
  _duration_ms integer DEFAULT NULL,
  _status text DEFAULT NULL,
  _triggered_by text DEFAULT 'orchestrator'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_status text;
  v_auto_disable_threshold int := 5;
  v_new_failures int;
BEGIN
  v_status := COALESCE(_status, CASE WHEN _success THEN 'success' ELSE 'failed' END);

  -- Audit row per run
  INSERT INTO public.automation_runs (
    job_key, started_at, finished_at, duration_ms, status, error, triggered_by, output_summary
  ) VALUES (
    _job_key,
    COALESCE(now() - make_interval(secs => COALESCE(_duration_ms, 0) / 1000.0), now()),
    now(),
    _duration_ms,
    v_status,
    CASE WHEN _success THEN NULL ELSE _error END,
    _triggered_by,
    COALESCE(_payload, '{}'::jsonb)
  );

  -- Job-level rollup
  UPDATE public.automation_jobs
  SET
    last_run_at = now(),
    last_status = v_status,
    last_error = CASE WHEN _success THEN NULL ELSE _error END,
    last_payload = COALESCE(_payload, '{}'::jsonb),
    total_runs = total_runs + 1,
    total_successes = total_successes + CASE WHEN _success THEN 1 ELSE 0 END,
    consecutive_failures = CASE WHEN _success THEN 0 ELSE consecutive_failures + 1 END,
    enabled = CASE
      WHEN NOT _success AND consecutive_failures + 1 >= v_auto_disable_threshold THEN false
      ELSE enabled
    END,
    updated_at = now()
  WHERE job_key = _job_key
  RETURNING consecutive_failures INTO v_new_failures;

  -- Anomaly insert when auto-disabled
  IF NOT _success AND v_new_failures >= v_auto_disable_threshold THEN
    INSERT INTO public.automation_anomalies (job_key, severity, message, details)
    VALUES (
      _job_key,
      'critical',
      'Job dezactivat automat după ' || v_new_failures || ' eșecuri consecutive',
      jsonb_build_object('last_error', _error, 'auto_disabled', true)
    );
  END IF;
END;
$function$;

-- Retention: keep last 30 days of run history (cleanup invoked by self-healing)
CREATE OR REPLACE FUNCTION public.automation_runs_cleanup(_retention_days integer DEFAULT 30)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_count int;
BEGIN
  WITH del AS (
    DELETE FROM public.automation_runs
    WHERE started_at < now() - (_retention_days || ' days')::interval
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM del;
  RETURN v_count;
END;
$function$;
