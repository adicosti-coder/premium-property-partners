DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'automation_jobs',
    'automation_runs',
    'automation_anomalies',
    'automation_live_logs',
    'cron_run_log',
    'voice_agent_clarity_logs',
    'voice_agent_tts_errors',
    'voice_tts_request_logs',
    'indexnow_pings',
    'prospect_scan_jobs',
    'prospect_rejection_alerts',
    'admin_audit_log',
    'voice_call_sessions'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime DROP TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;