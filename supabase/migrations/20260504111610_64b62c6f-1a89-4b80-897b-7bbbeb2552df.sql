CREATE TABLE IF NOT EXISTS public.voice_agent_language_violations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid,
  turn integer,
  raw_reply text,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS voice_agent_language_violations_session_idx
  ON public.voice_agent_language_violations(session_id, created_at DESC);

CREATE INDEX IF NOT EXISTS voice_agent_language_violations_recent_idx
  ON public.voice_agent_language_violations(created_at DESC);

ALTER TABLE public.voice_agent_language_violations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view language violations"
  ON public.voice_agent_language_violations
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Service role can insert language violations"
  ON public.voice_agent_language_violations
  FOR INSERT
  TO service_role
  WITH CHECK (true);