-- Pronunciation lexicon
CREATE TABLE IF NOT EXISTS public.voice_pronunciation_lexicon (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original text NOT NULL,
  phonetic text NOT NULL,
  case_sensitive boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT voice_pronunciation_lexicon_original_uniq UNIQUE (original)
);

ALTER TABLE public.voice_pronunciation_lexicon ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage lexicon"
  ON public.voice_pronunciation_lexicon
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_voice_lexicon_updated
  BEFORE UPDATE ON public.voice_pronunciation_lexicon
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Clarity logs per call
CREATE TABLE IF NOT EXISTS public.voice_agent_clarity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.voice_call_sessions(id) ON DELETE CASCADE,
  clarity_score integer NOT NULL CHECK (clarity_score >= 0 AND clarity_score <= 100),
  tts_latency_ms_avg integer,
  tts_latency_ms_max integer,
  tts_calls_count integer NOT NULL DEFAULT 0,
  tts_errors_count integer NOT NULL DEFAULT 0,
  twilio_call_status text,
  fallback_used boolean NOT NULL DEFAULT false,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.voice_agent_clarity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read clarity logs"
  ON public.voice_agent_clarity_logs
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_clarity_logs_created ON public.voice_agent_clarity_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clarity_logs_session ON public.voice_agent_clarity_logs (session_id);

-- TTS error stream (live debug)
CREATE TABLE IF NOT EXISTS public.voice_agent_tts_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid,
  source text NOT NULL DEFAULT 'elevenlabs',
  error_type text NOT NULL,
  http_status integer,
  message text,
  text_snippet text,
  voice_id text,
  latency_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.voice_agent_tts_errors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read tts errors"
  ON public.voice_agent_tts_errors
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_tts_errors_created ON public.voice_agent_tts_errors (created_at DESC);

-- Augment voice_call_sessions
ALTER TABLE public.voice_call_sessions
  ADD COLUMN IF NOT EXISTS clarity_score integer,
  ADD COLUMN IF NOT EXISTS tts_latency_ms_avg integer,
  ADD COLUMN IF NOT EXISTS tts_errors_count integer NOT NULL DEFAULT 0;

-- Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.voice_agent_tts_errors;
ALTER PUBLICATION supabase_realtime ADD TABLE public.voice_agent_clarity_logs;
ALTER TABLE public.voice_agent_tts_errors REPLICA IDENTITY FULL;
ALTER TABLE public.voice_agent_clarity_logs REPLICA IDENTITY FULL;

-- Seed initial RO pronunciation entries
INSERT INTO public.voice_pronunciation_lexicon (original, phonetic, case_sensitive, notes) VALUES
  ('Iosefin',     'Yosefin',          false, 'Cartier Timișoara — pronunție românească naturală'),
  ('Dumbrăvița',  'Dumbrăvitza',      false, 'Localitate lângă Timișoara — evită „ts" englezit'),
  ('Cetate',      'Tchetate',         false, 'Centrul istoric Timișoara — „c" românesc'),
  ('Fabric',      'Fabrik',           false, 'Cartier Timișoara'),
  ('Aradului',    'Aradului',         false, 'Calea Aradului — pronunție clară'),
  ('ApArt',       'Ap-Art',           true,  'Brand: separă silabele pentru claritate'),
  ('RealTrust',   'Riăl-Trast',       true,  'Brand: pronunție engleză naturalizată'),
  ('Timișoara',   'Timișoara',        false, 'Forță diacriticele'),
  ('Andrei',      'Andrei',           false, 'Numele agentului — neschimbat')
ON CONFLICT (original) DO NOTHING;