CREATE TABLE public.voice_batch_campaign (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  enabled boolean NOT NULL DEFAULT false,
  delay_minutes int NOT NULL DEFAULT 3,
  current_session_id uuid,
  current_prospect_id uuid,
  current_label text,
  last_call_ended_at timestamptz,
  last_tick_at timestamptz,
  last_message text,
  calls_started int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.voice_batch_campaign TO authenticated;
GRANT ALL ON public.voice_batch_campaign TO service_role;
ALTER TABLE public.voice_batch_campaign ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read campaign" ON public.voice_batch_campaign FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins update campaign" ON public.voice_batch_campaign FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
INSERT INTO public.voice_batch_campaign (id) VALUES (1);