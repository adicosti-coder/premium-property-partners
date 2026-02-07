-- Create property_views table for tracking
CREATE TABLE public.property_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  user_id UUID,
  session_id TEXT NOT NULL,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  referrer TEXT,
  user_agent TEXT,
  page_path TEXT
);

-- Enable RLS
ALTER TABLE public.property_views ENABLE ROW LEVEL SECURITY;

-- Anyone can insert views (tracking)
CREATE POLICY "Anyone can insert property views"
ON public.property_views
FOR INSERT
WITH CHECK (true);

-- Only admins can read views (for statistics)
CREATE POLICY "Admins can view property views"
ON public.property_views
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Create index for efficient queries
CREATE INDEX idx_property_views_property_id ON public.property_views(property_id);
CREATE INDEX idx_property_views_viewed_at ON public.property_views(viewed_at DESC);

-- Enable realtime for live stats (optional)
ALTER PUBLICATION supabase_realtime ADD TABLE public.property_views;