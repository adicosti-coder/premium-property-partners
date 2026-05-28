-- Defense-in-depth: add RESTRICTIVE admin-only SELECT policies on realtime-published
-- tables so any future permissive policy cannot accidentally widen read access
-- (including via realtime postgres_changes subscriptions).

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'voice_call_sessions','voice_agent_clarity_logs','voice_agent_tts_errors',
    'cron_run_log','prospect_rejection_alerts','automation_jobs','automation_anomalies',
    'automation_runs','automation_live_logs','voice_tts_request_logs','indexnow_pings'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS "restrict_select_admin_only" ON public.%I;', t
    );
    EXECUTE format(
      'CREATE POLICY "restrict_select_admin_only" ON public.%I '
      'AS RESTRICTIVE FOR SELECT TO authenticated '
      'USING (public.has_role(auth.uid(), ''admin''::app_role));',
      t
    );
  END LOOP;
END $$;