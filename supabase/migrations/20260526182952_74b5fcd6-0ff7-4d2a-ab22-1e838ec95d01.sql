
ALTER TABLE public.voice_agent_settings
  ADD COLUMN IF NOT EXISTS production_webhook_url text,
  ADD COLUMN IF NOT EXISTS alert_hot_deals_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS alert_worker_errors_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hot_deal_min_score integer NOT NULL DEFAULT 85,
  ADD COLUMN IF NOT EXISTS worker_failed_threshold integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS worker_alert_last_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS worker_failed_baseline_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS worker_failed_baseline_at timestamptz;
