ALTER TABLE public.wa_messages
  ADD COLUMN IF NOT EXISTS delivery_status text,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS read_at timestamptz;

CREATE INDEX IF NOT EXISTS wa_messages_wa_message_id_idx
  ON public.wa_messages (wa_message_id);