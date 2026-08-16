DO $$
DECLARE
  v_secret text;
  v_req bigint;
BEGIN
  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets
  WHERE name = 'cron_reconcile_secret'
  LIMIT 1;

  IF v_secret IS NULL THEN
    RAISE EXCEPTION 'cron_reconcile_secret missing in vault';
  END IF;

  SELECT net.http_post(
    url := 'https://mvzssjyzbwccioqvhjpo.supabase.co/functions/v1/reindex-dynamic-urls',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', v_secret
    ),
    body := jsonb_build_object('triggered_by', 'manual_admin_run', 'submit_google', true),
    timeout_milliseconds := 120000
  ) INTO v_req;

  RAISE NOTICE 'reindex-dynamic-urls request_id=%', v_req;
END $$;