ALTER TABLE public.prospect_rejection_alerts
  ADD COLUMN IF NOT EXISTS notified_at timestamptz,
  ADD COLUMN IF NOT EXISTS notification_channels text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS notification_error text;