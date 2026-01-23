-- Add spam alert settings to site_settings
ALTER TABLE public.site_settings 
ADD COLUMN IF NOT EXISTS spam_alert_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS spam_rate_threshold numeric DEFAULT 20,
ADD COLUMN IF NOT EXISTS last_spam_alert_at timestamp with time zone;

-- Add comment for documentation
COMMENT ON COLUMN public.site_settings.spam_alert_enabled IS 'Enable/disable spam rate alerts';
COMMENT ON COLUMN public.site_settings.spam_rate_threshold IS 'Spam rate threshold percentage (failed/total * 100) to trigger alert';
COMMENT ON COLUMN public.site_settings.last_spam_alert_at IS 'Last time a spam alert was sent (for cooldown)';