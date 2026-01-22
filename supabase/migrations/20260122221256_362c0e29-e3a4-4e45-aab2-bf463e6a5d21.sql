-- Add conversion alert settings to site_settings
ALTER TABLE public.site_settings 
ADD COLUMN IF NOT EXISTS conversion_rate_threshold INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS conversion_alert_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS last_conversion_alert_at TIMESTAMP WITH TIME ZONE;

-- Create table for admin alert subscriptions
CREATE TABLE IF NOT EXISTS public.admin_alert_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  alert_types TEXT[] NOT NULL DEFAULT '{conversion_rate}'::text[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_alert_subscriptions ENABLE ROW LEVEL SECURITY;

-- Admins can manage their own subscriptions
CREATE POLICY "Admins can manage their alert subscriptions"
  ON public.admin_alert_subscriptions
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) AND auth.uid() = user_id)
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND auth.uid() = user_id);

-- Create index
CREATE INDEX idx_admin_alert_subscriptions_user_id ON public.admin_alert_subscriptions(user_id);