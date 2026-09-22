-- Mementouri 24h/72h pentru proprietarii contactați manual (WhatsApp/SMS) din Admin.
ALTER TABLE public.owner_outreach_messages
  ADD COLUMN IF NOT EXISTS phone_normalized text,
  ADD COLUMN IF NOT EXISTS sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS replied_at timestamptz,
  ADD COLUMN IF NOT EXISTS reminder_stage integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_reminder_at timestamptz,
  ADD COLUMN IF NOT EXISTS template_key text;

CREATE INDEX IF NOT EXISTS owner_outreach_messages_next_reminder_idx
  ON public.owner_outreach_messages (next_reminder_at)
  WHERE replied_at IS NULL AND next_reminder_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS owner_outreach_messages_phone_idx
  ON public.owner_outreach_messages (phone_normalized);