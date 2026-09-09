ALTER TABLE public.wa_outbound_queue ADD COLUMN IF NOT EXISTS alerted_at timestamptz;
ALTER TABLE public.admin_email_failures ADD COLUMN IF NOT EXISTS alerted_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_wa_outbound_queue_alert ON public.wa_outbound_queue (status, alerted_at);
CREATE INDEX IF NOT EXISTS idx_admin_email_failures_alert ON public.admin_email_failures (alerted_at, created_at DESC);