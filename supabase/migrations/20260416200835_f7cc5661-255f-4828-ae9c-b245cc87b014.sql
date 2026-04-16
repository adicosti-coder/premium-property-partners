-- Voice call sessions table for AI Voice Agent (Twilio)
CREATE TABLE IF NOT EXISTS public.voice_call_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  twilio_call_sid text UNIQUE,
  direction text NOT NULL DEFAULT 'outbound',
  to_number text NOT NULL,
  from_number text,
  scraper_lead_id uuid REFERENCES public.scraper_leads(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  initiated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'queued',
  call_duration_seconds integer,
  recording_url text,
  transcript jsonb DEFAULT '[]'::jsonb,
  ai_summary text,
  ai_outcome text,
  ai_sentiment text,
  next_action text,
  appointment_scheduled_at timestamptz,
  call_objective text DEFAULT 'qualify',
  voice_agent_prompt text,
  cost_estimate_usd numeric(10,4),
  error_message text,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_voice_calls_status ON public.voice_call_sessions(status);
CREATE INDEX IF NOT EXISTS idx_voice_calls_scraper_lead ON public.voice_call_sessions(scraper_lead_id) WHERE scraper_lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_voice_calls_lead ON public.voice_call_sessions(lead_id) WHERE lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_voice_calls_created ON public.voice_call_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_voice_calls_sid ON public.voice_call_sessions(twilio_call_sid) WHERE twilio_call_sid IS NOT NULL;

ALTER TABLE public.voice_call_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage voice calls"
  ON public.voice_call_sessions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role manages voice calls"
  ON public.voice_call_sessions FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE TRIGGER trg_voice_calls_updated
  BEFORE UPDATE ON public.voice_call_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.voice_call_sessions;