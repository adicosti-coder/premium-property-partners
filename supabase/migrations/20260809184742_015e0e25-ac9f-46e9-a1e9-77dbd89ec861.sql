ALTER TABLE public.wa_agent_settings
  ADD COLUMN IF NOT EXISTS outbound_max_per_hour integer NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS outbound_max_per_day integer NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS outbound_min_delay_seconds integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS outbound_max_delay_seconds integer NOT NULL DEFAULT 90;

CREATE INDEX IF NOT EXISTS idx_wa_outbound_queue_status_sched
  ON public.wa_outbound_queue (status, scheduled_at DESC);
CREATE INDEX IF NOT EXISTS idx_wa_outbound_queue_sent_at
  ON public.wa_outbound_queue (sent_at DESC);