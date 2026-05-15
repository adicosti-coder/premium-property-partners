
ALTER TABLE public.prospect_listings
  ADD COLUMN IF NOT EXISTS agency_suspicion_score integer,
  ADD COLUMN IF NOT EXISTS agency_suspicion_reason text,
  ADD COLUMN IF NOT EXISTS agency_classified_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_prospect_agency_unscored
  ON public.prospect_listings (created_at DESC)
  WHERE agency_suspicion_score IS NULL AND is_active = true;

CREATE INDEX IF NOT EXISTS idx_prospect_dedup_key
  ON public.prospect_listings (dedup_key)
  WHERE dedup_key IS NOT NULL;

-- Atomic helper to mark a job run complete (success or failure)
CREATE OR REPLACE FUNCTION public.automation_complete_run(
  _job_key text,
  _success boolean,
  _error text DEFAULT NULL,
  _payload jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.automation_jobs
  SET
    last_run_at = now(),
    last_status = CASE WHEN _success THEN 'success' ELSE 'failed' END,
    last_error = CASE WHEN _success THEN NULL ELSE _error END,
    last_payload = COALESCE(_payload, '{}'::jsonb),
    total_runs = total_runs + 1,
    total_successes = total_successes + CASE WHEN _success THEN 1 ELSE 0 END,
    consecutive_failures = CASE WHEN _success THEN 0 ELSE consecutive_failures + 1 END,
    -- self-healing: auto-disable after 3 consecutive failures
    enabled = CASE
      WHEN NOT _success AND consecutive_failures + 1 >= 3 THEN false
      ELSE enabled
    END,
    updated_at = now()
  WHERE job_key = _job_key;
END;
$$;

REVOKE ALL ON FUNCTION public.automation_complete_run(text, boolean, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.automation_complete_run(text, boolean, text, jsonb) TO service_role;
