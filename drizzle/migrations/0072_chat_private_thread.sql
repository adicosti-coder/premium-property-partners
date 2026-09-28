ALTER TABLE public.chat_conversations
  ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS page_title text,
  ADD COLUMN IF NOT EXISTS page_url text,
  ADD COLUMN IF NOT EXISTS summary_sent_at timestamptz;
CREATE INDEX IF NOT EXISTS chat_conversations_lead_id_idx ON public.chat_conversations(lead_id);
ALTER TABLE public.chat_messages DROP CONSTRAINT IF EXISTS chat_messages_role_check;
ALTER TABLE public.chat_messages ADD CONSTRAINT chat_messages_role_check CHECK (role = ANY (ARRAY['user','assistant','system','tool','agent']));

SELECT cron.schedule('chat-conversation-summary-hourly', '5 * * * *', $$
  SELECT net.http_post(
    url := 'https://mvzssjyzbwccioqvhjpo.supabase.co/functions/v1/chat-conversation-summary',
    headers := jsonb_build_object('Content-Type','application/json','x-cron-secret', public.get_cron_reconcile_secret()),
    body := '{}'::jsonb);
$$);