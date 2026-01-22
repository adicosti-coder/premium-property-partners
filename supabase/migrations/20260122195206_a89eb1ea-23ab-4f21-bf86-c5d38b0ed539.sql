-- Create table to track import events for trends
CREATE TABLE public.poi_import_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shared_link_id UUID NOT NULL REFERENCES public.shared_poi_links(id) ON DELETE CASCADE,
  imported_by UUID REFERENCES auth.users(id),
  imported_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.poi_import_events ENABLE ROW LEVEL SECURITY;

-- Policy: Link owners can view their import events
CREATE POLICY "Link owners can view their import events"
ON public.poi_import_events
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.shared_poi_links
    WHERE shared_poi_links.id = poi_import_events.shared_link_id
    AND shared_poi_links.user_id = auth.uid()
  )
);

-- Policy: Anyone can insert import events (for tracking)
CREATE POLICY "Anyone can insert import events"
ON public.poi_import_events
FOR INSERT
WITH CHECK (true);

-- Add index for faster queries
CREATE INDEX idx_poi_import_events_shared_link_id ON public.poi_import_events(shared_link_id);
CREATE INDEX idx_poi_import_events_created_at ON public.poi_import_events(created_at);