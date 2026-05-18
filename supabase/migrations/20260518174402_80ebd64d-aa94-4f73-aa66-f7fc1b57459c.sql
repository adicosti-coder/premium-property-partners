ALTER TABLE public.email_send_log ADD COLUMN IF NOT EXISTS idempotency_key text;
CREATE INDEX IF NOT EXISTS idx_email_send_log_idem_sent ON public.email_send_log (idempotency_key) WHERE status = 'sent' AND idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_email_send_log_idem ON public.email_send_log (idempotency_key) WHERE idempotency_key IS NOT NULL;