
-- 1. orchestrator_config on settings
ALTER TABLE public.automation_settings
  ADD COLUMN IF NOT EXISTS orchestrator_config jsonb NOT NULL DEFAULT jsonb_build_object(
    'concurrency', 4,
    'default_timeout_ms', 50000,
    'default_max_retries', 1,
    'retry_on_timeout', false,
    'lease_ttl_ms', 180000,
    'backoff_jitter_ms', 500
  );

-- 2. index to look up in-flight runs fast
CREATE INDEX IF NOT EXISTS idx_automation_runs_inflight
  ON public.automation_runs (job_key, started_at DESC)
  WHERE finished_at IS NULL;

-- 3. Acquire-lease RPC: returns new run_id or NULL if a fresh in-flight run exists
CREATE OR REPLACE FUNCTION public.automation_acquire_run_lease(
  _job_key text,
  _triggered_by text DEFAULT 'orchestrator',
  _lease_ttl_ms integer DEFAULT 180000
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_existing uuid;
  v_id uuid;
BEGIN
  -- look for an in-flight run started within the lease window
  SELECT id INTO v_existing
  FROM public.automation_runs
  WHERE job_key = _job_key
    AND finished_at IS NULL
    AND started_at > now() - make_interval(secs => GREATEST(_lease_ttl_ms,1000) / 1000.0)
  ORDER BY started_at DESC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_existing IS NOT NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.automation_runs (job_key, started_at, status, triggered_by)
  VALUES (_job_key, now(), 'running', _triggered_by)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- 4. Finalize-run RPC: updates the existing running row + bumps job stats
CREATE OR REPLACE FUNCTION public.automation_finish_run(
  _run_id uuid,
  _job_key text,
  _success boolean,
  _error text DEFAULT NULL,
  _payload jsonb DEFAULT '{}'::jsonb,
  _duration_ms integer DEFAULT NULL,
  _status text DEFAULT NULL,
  _retry_count integer DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_status text;
  v_auto_disable_threshold int := 5;
  v_new_failures int;
BEGIN
  v_status := COALESCE(_status, CASE WHEN _success THEN 'success' ELSE 'failed' END);

  IF _run_id IS NOT NULL THEN
    UPDATE public.automation_runs
    SET finished_at = now(),
        duration_ms = _duration_ms,
        status = v_status,
        error = CASE WHEN _success THEN NULL ELSE LEFT(COALESCE(_error,''),500) END,
        output_summary = COALESCE(_payload, '{}'::jsonb),
        retry_count = COALESCE(_retry_count, 0)
    WHERE id = _run_id;
  ELSE
    INSERT INTO public.automation_runs (
      job_key, started_at, finished_at, duration_ms, status, error, triggered_by, output_summary, retry_count
    ) VALUES (
      _job_key,
      COALESCE(now() - make_interval(secs => COALESCE(_duration_ms, 0) / 1000.0), now()),
      now(),
      _duration_ms,
      v_status,
      CASE WHEN _success THEN NULL ELSE LEFT(COALESCE(_error,''),500) END,
      'orchestrator',
      COALESCE(_payload, '{}'::jsonb),
      COALESCE(_retry_count, 0)
    );
  END IF;

  UPDATE public.automation_jobs
  SET last_run_at = now(),
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
      _job_key, 'critical',
      'Job dezactivat automat după ' || v_new_failures || ' eșecuri consecutive',
      jsonb_build_object('last_error', _error, 'auto_disabled', true)
    );
  END IF;
END;
$$;

-- 5. Janitor: mark stale "running" rows as failed after lease expires (safety net)
CREATE OR REPLACE FUNCTION public.automation_expire_stale_runs(
  _lease_ttl_ms integer DEFAULT 180000
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_n integer;
BEGIN
  WITH upd AS (
    UPDATE public.automation_runs
    SET finished_at = now(),
        status = 'timeout',
        error = 'lease_expired'
    WHERE finished_at IS NULL
      AND started_at < now() - make_interval(secs => GREATEST(_lease_ttl_ms,1000) / 1000.0)
    RETURNING 1
  )
  SELECT count(*) INTO v_n FROM upd;
  RETURN COALESCE(v_n,0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.automation_acquire_run_lease(text,text,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.automation_finish_run(uuid,text,boolean,text,jsonb,integer,text,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.automation_expire_stale_runs(integer) TO service_role;
