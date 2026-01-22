-- Create table to track email link clicks
CREATE TABLE public.email_click_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  email_type TEXT NOT NULL,
  link_type TEXT NOT NULL,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  clicked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_agent TEXT,
  ip_address TEXT
);

-- Enable RLS
ALTER TABLE public.email_click_tracking ENABLE ROW LEVEL SECURITY;

-- Policy for service role to insert clicks
CREATE POLICY "Service role can manage click tracking"
  ON public.email_click_tracking
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- Policy for admins to view click tracking
CREATE POLICY "Admins can view click tracking"
  ON public.email_click_tracking
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster queries
CREATE INDEX idx_email_click_tracking_user_id ON public.email_click_tracking(user_id);
CREATE INDEX idx_email_click_tracking_email_type ON public.email_click_tracking(email_type);
CREATE INDEX idx_email_click_tracking_clicked_at ON public.email_click_tracking(clicked_at);