-- Create CTA analytics tracking table
CREATE TABLE public.cta_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cta_type TEXT NOT NULL, -- 'call', 'whatsapp', 'booking', 'airbnb'
  page_path TEXT NOT NULL,
  property_id TEXT,
  property_name TEXT,
  user_id UUID,
  session_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cta_analytics ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts for tracking (read restricted to admins)
CREATE POLICY "Anyone can insert CTA analytics"
ON public.cta_analytics
FOR INSERT
WITH CHECK (true);

-- Only authenticated admins can read analytics
CREATE POLICY "Admins can read CTA analytics"
ON public.cta_analytics
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.email IN ('admin@realtrust.ro', 'office@realtrust.ro')
  )
);

-- Create index for faster queries
CREATE INDEX idx_cta_analytics_type ON public.cta_analytics(cta_type);
CREATE INDEX idx_cta_analytics_created_at ON public.cta_analytics(created_at DESC);
CREATE INDEX idx_cta_analytics_page_path ON public.cta_analytics(page_path);