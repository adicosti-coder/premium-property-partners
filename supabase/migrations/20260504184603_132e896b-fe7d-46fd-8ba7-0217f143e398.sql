
ALTER TABLE public.voice_caller_profiles
  ADD COLUMN IF NOT EXISTS last_objection text,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_voice_caller_profiles_active
  ON public.voice_caller_profiles(last_call_at DESC)
  WHERE archived_at IS NULL;
