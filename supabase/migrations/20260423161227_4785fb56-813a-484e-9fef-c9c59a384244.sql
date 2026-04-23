ALTER TABLE public.voice_agent_scripts
  ADD COLUMN IF NOT EXISTS ab_variant_script_id UUID REFERENCES public.voice_agent_scripts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ab_traffic_split INTEGER NOT NULL DEFAULT 0 CHECK (ab_traffic_split >= 0 AND ab_traffic_split <= 100);

CREATE TABLE IF NOT EXISTS public.voice_agent_script_test_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  script_id UUID REFERENCES public.voice_agent_scripts(id) ON DELETE SET NULL,
  script_name TEXT,
  script_version INTEGER,
  ab_variant TEXT,
  session_id UUID REFERENCES public.voice_call_sessions(id) ON DELETE SET NULL,
  to_number TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  fallback_reason TEXT,
  outcome TEXT,
  call_duration_seconds INTEGER,
  transcript_turns INTEGER,
  triggered_by UUID,
  is_test_call BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS voice_agent_script_test_logs_created_idx
  ON public.voice_agent_script_test_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS voice_agent_script_test_logs_session_idx
  ON public.voice_agent_script_test_logs (session_id);
CREATE INDEX IF NOT EXISTS voice_agent_script_test_logs_script_idx
  ON public.voice_agent_script_test_logs (script_id);

ALTER TABLE public.voice_agent_script_test_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage script test logs"
  ON public.voice_agent_script_test_logs
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Service role bypasses RLS, but be explicit with a permissive policy for service_role inserts via edge functions
CREATE POLICY "Service role insert test logs"
  ON public.voice_agent_script_test_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role update test logs"
  ON public.voice_agent_script_test_logs
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role read test logs"
  ON public.voice_agent_script_test_logs
  FOR SELECT
  TO service_role
  USING (true);

CREATE TRIGGER update_voice_agent_script_test_logs_updated_at
  BEFORE UPDATE ON public.voice_agent_script_test_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();