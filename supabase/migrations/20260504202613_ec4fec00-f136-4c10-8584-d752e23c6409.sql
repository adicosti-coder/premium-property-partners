ALTER TABLE public.voice_call_sessions
  ADD COLUMN IF NOT EXISTS followup_draft jsonb,
  ADD COLUMN IF NOT EXISTS followup_status text DEFAULT 'pending_review';

CREATE INDEX IF NOT EXISTS idx_voice_call_sessions_followup_status
  ON public.voice_call_sessions(followup_status)
  WHERE followup_draft IS NOT NULL;