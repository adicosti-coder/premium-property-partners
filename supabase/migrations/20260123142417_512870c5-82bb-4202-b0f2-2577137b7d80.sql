-- Create table for hCaptcha verification logs
CREATE TABLE public.captcha_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  form_type TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  success BOOLEAN NOT NULL DEFAULT false,
  error_codes TEXT[],
  score NUMERIC,
  hostname TEXT
);

-- Enable RLS
ALTER TABLE public.captcha_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view logs
CREATE POLICY "Admins can view captcha logs"
ON public.captcha_logs
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Create index for faster queries
CREATE INDEX idx_captcha_logs_created_at ON public.captcha_logs(created_at DESC);
CREATE INDEX idx_captcha_logs_success ON public.captcha_logs(success);
CREATE INDEX idx_captcha_logs_form_type ON public.captcha_logs(form_type);