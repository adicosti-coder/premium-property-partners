
REVOKE EXECUTE ON FUNCTION public.automation_acquire_run_lease(text,text,integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.automation_finish_run(uuid,text,boolean,text,jsonb,integer,text,integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.automation_expire_stale_runs(integer) FROM PUBLIC, anon, authenticated;
