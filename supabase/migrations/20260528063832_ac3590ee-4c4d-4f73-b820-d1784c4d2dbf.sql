CREATE TABLE public.voice_tts_request_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  provider TEXT NOT NULL,
  ttfb_ms INTEGER,
  total_duration_ms INTEGER,
  text_length INTEGER,
  http_status INTEGER,
  fallback_used BOOLEAN NOT NULL DEFAULT false,
  retry_count INTEGER NOT NULL DEFAULT 0,
  voice_id TEXT,
  mode TEXT,
  error TEXT
);

CREATE INDEX idx_voice_tts_logs_created_at ON public.voice_tts_request_logs (created_at DESC);

GRANT SELECT ON public.voice_tts_request_logs TO authenticated;
GRANT ALL ON public.voice_tts_request_logs TO service_role;

ALTER TABLE public.voice_tts_request_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read tts logs"
ON public.voice_tts_request_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

ALTER PUBLICATION supabase_realtime ADD TABLE public.voice_tts_request_logs;