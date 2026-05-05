ALTER TABLE public.voice_call_sessions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.voice_call_sessions;