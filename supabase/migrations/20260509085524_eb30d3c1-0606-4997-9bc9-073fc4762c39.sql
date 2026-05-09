
ALTER TABLE public.e2e_test_runs ADD COLUMN IF NOT EXISTS recovery_notified_at timestamptz;

CREATE OR REPLACE FUNCTION public.cleanup_old_e2e_runs()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count int;
BEGIN
  WITH del AS (
    DELETE FROM public.e2e_test_runs
    WHERE run_at < now() - interval '90 days'
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM del;

  INSERT INTO public.cron_run_log (job_name, status, finished_at, duration_ms, details)
  VALUES ('cleanup-e2e-runs', 'success', now(), 0, jsonb_build_object('deleted', v_count));

  RETURN v_count;
END;
$$;
