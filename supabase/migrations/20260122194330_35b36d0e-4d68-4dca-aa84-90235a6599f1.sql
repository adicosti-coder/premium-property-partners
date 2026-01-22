-- Create table for tracking shared POI links
CREATE TABLE public.shared_poi_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  share_code TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL,
  poi_ids UUID[] NOT NULL,
  import_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_imported_at TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security
ALTER TABLE public.shared_poi_links ENABLE ROW LEVEL SECURITY;

-- Users can view their own shared links
CREATE POLICY "Users can view their own shared links" 
ON public.shared_poi_links 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can create their own shared links
CREATE POLICY "Users can create shared links" 
ON public.shared_poi_links 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Anyone can read shared links by share_code (for importing)
CREATE POLICY "Anyone can read shared links by code" 
ON public.shared_poi_links 
FOR SELECT 
USING (true);

-- Service role can update import counts
CREATE POLICY "Service can update import counts" 
ON public.shared_poi_links 
FOR UPDATE 
USING (true);

-- Create indexes
CREATE INDEX idx_shared_poi_links_share_code ON public.shared_poi_links(share_code);
CREATE INDEX idx_shared_poi_links_user_id ON public.shared_poi_links(user_id);