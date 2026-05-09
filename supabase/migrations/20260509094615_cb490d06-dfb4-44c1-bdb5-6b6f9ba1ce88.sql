
ALTER TABLE public.system_health_thresholds
  ADD COLUMN IF NOT EXISTS slack_webhook_url text NULL;

REVOKE EXECUTE ON FUNCTION public.cleanup_old_e2e_runs() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_e2e_runs() FROM anon;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_e2e_runs() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_e2e_runs() TO service_role;
