-- Add image_url column to local_tips
ALTER TABLE public.local_tips 
ADD COLUMN image_url TEXT;

-- Add image_url column to points_of_interest
ALTER TABLE public.points_of_interest 
ADD COLUMN image_url TEXT;