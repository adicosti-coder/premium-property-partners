
-- Drop the older 4-arg overload to avoid ambiguity
DROP FUNCTION IF EXISTS public.automation_complete_run(text, boolean, text, jsonb);

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

  UPDATE public.automation_jobs
  SET
    last_run_at = now(),
    last_status = v_status,
    last_error = CASE WHEN _success THEN NULL ELSE _error END,
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

  IF NOT _success AND COALESCE(v_new_failures, 0) >= v_auto_disable_threshold THEN
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
