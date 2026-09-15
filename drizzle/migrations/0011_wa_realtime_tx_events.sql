DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'wa_transaction_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.wa_transaction_events;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'make_lead_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.make_lead_events;
  END IF;
END $$;

ALTER TABLE public.wa_transaction_events REPLICA IDENTITY FULL;
ALTER TABLE public.wa_messages REPLICA IDENTITY FULL;
ALTER TABLE public.wa_conversations REPLICA IDENTITY FULL;