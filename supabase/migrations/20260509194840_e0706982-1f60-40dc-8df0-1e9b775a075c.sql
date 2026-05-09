ALTER TABLE public.voice_agent_settings 
ADD COLUMN IF NOT EXISTS real_conversation_threshold_seconds INTEGER NOT NULL DEFAULT 30;