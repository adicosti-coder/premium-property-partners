-- Create table for POI favorites
CREATE TABLE public.poi_favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  poi_id UUID NOT NULL REFERENCES public.points_of_interest(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, poi_id)
);

-- Enable Row Level Security
ALTER TABLE public.poi_favorites ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own favorites" 
ON public.poi_favorites 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can add their own favorites" 
ON public.poi_favorites 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own favorites" 
ON public.poi_favorites 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_poi_favorites_user_id ON public.poi_favorites(user_id);
CREATE INDEX idx_poi_favorites_poi_id ON public.poi_favorites(poi_id);