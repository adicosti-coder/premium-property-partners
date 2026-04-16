
CREATE TABLE IF NOT EXISTS public.voice_agent_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  auto_dial_enabled BOOLEAN NOT NULL DEFAULT false,
  min_lead_score INTEGER NOT NULL DEFAULT 90,
  allowed_hours_start INTEGER NOT NULL DEFAULT 10,
  allowed_hours_end INTEGER NOT NULL DEFAULT 18,
  max_calls_per_day INTEGER NOT NULL DEFAULT 20,
  default_objective TEXT NOT NULL DEFAULT 'qualify',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID,
  CONSTRAINT singleton CHECK (id = 1)
);

INSERT INTO public.voice_agent_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

ALTER TABLE public.voice_agent_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view voice agent settings"
  ON public.voice_agent_settings FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update voice agent settings"
  ON public.voice_agent_settings FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
