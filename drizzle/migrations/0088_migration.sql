ALTER TABLE public.investor_alert_deliveries
  ADD COLUMN IF NOT EXISTS wa_message_id text,
  ADD COLUMN IF NOT EXISTS template_name text,
  ADD COLUMN IF NOT EXISTS sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS read_at timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS investor_alert_deliveries_sub_listing_uidx
  ON public.investor_alert_deliveries (subscriber_id, prospect_listing_id);
CREATE INDEX IF NOT EXISTS investor_alert_deliveries_wamid_idx
  ON public.investor_alert_deliveries (wa_message_id) WHERE wa_message_id IS NOT NULL;