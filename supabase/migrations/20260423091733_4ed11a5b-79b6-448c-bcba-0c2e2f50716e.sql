ALTER TABLE public.voice_call_sessions
  ADD COLUMN IF NOT EXISTS detected_language text,
  ADD COLUMN IF NOT EXISTS language_retry_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS language_retry_of uuid REFERENCES public.voice_call_sessions(id) ON DELETE SET NULL;