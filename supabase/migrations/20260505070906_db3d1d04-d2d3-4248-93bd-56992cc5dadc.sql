-- Playbook addendum: auto-generated "lessons learned" from rejected calls
CREATE TABLE public.voice_agent_playbook_addendum (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson TEXT NOT NULL,
  source_session_id UUID REFERENCES public.voice_call_sessions(id) ON DELETE SET NULL,
  profile_summary TEXT,
  severity TEXT NOT NULL DEFAULT 'info',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX voice_agent_playbook_active_idx
  ON public.voice_agent_playbook_addendum (is_active, created_at DESC);

ALTER TABLE public.voice_agent_playbook_addendum ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage playbook addendum"
  ON public.voice_agent_playbook_addendum
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Service role full access playbook"
  ON public.voice_agent_playbook_addendum
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER trg_playbook_addendum_updated
  BEFORE UPDATE ON public.voice_agent_playbook_addendum
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Safety state singleton (id always true)
CREATE TABLE public.voice_agent_safety_state (
  id BOOLEAN PRIMARY KEY DEFAULT true CHECK (id = true),
  calls_paused BOOLEAN NOT NULL DEFAULT false,
  paused_reason TEXT,
  success_rate_pct INTEGER,
  sample_size INTEGER,
  last_check_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.voice_agent_safety_state (id, calls_paused) VALUES (true, false)
  ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.voice_agent_safety_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage safety state"
  ON public.voice_agent_safety_state
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Service role full access safety"
  ON public.voice_agent_safety_state
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER trg_safety_state_updated
  BEFORE UPDATE ON public.voice_agent_safety_state
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();