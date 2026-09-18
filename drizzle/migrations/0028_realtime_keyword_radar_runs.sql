ALTER TABLE public.keyword_radar_runs REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.keyword_radar_runs;