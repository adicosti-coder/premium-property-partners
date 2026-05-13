ALTER TABLE public.prospect_rejection_alerts REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.prospect_rejection_alerts;