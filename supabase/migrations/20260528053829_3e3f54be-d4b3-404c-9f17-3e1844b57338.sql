
DROP FUNCTION IF EXISTS public.cleanup_old_tracking_data();

CREATE FUNCTION public.cleanup_old_tracking_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_opens int := 0;
  deleted_clicks int := 0;
  started timestamptz := now();
BEGIN
  DELETE FROM public.email_open_tracking WHERE opened_at < now() - interval '180 days';
  GET DIAGNOSTICS deleted_opens = ROW_COUNT;

  DELETE FROM public.email_click_tracking WHERE clicked_at < now() - interval '180 days';
  GET DIAGNOSTICS deleted_clicks = ROW_COUNT;

  INSERT INTO public.cron_run_log(job_name, status, duration_ms, details)
  VALUES (
    'cleanup_old_tracking_data', 'success',
    EXTRACT(MILLISECONDS FROM (now() - started))::int,
    jsonb_build_object('deleted_opens', deleted_opens, 'deleted_clicks', deleted_clicks)
  );

  RETURN jsonb_build_object('ok', true, 'deleted_opens', deleted_opens, 'deleted_clicks', deleted_clicks);
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.cron_run_log(job_name, status, details)
  VALUES ('cleanup_old_tracking_data', 'failure', jsonb_build_object('error', SQLERRM));
  RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_old_tracking_data() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_tracking_data() TO service_role;

INSERT INTO public.cron_run_log(job_name, status, details)
VALUES ('cleanup_old_tracking_data', 'success', jsonb_build_object('bootstrap', true));
