CREATE UNIQUE INDEX IF NOT EXISTS voice_agent_script_test_logs_session_unique
  ON public.voice_agent_script_test_logs (session_id)
  WHERE session_id IS NOT NULL;