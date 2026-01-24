-- Add image_source column to track where the image came from
ALTER TABLE public.points_of_interest 
ADD COLUMN IF NOT EXISTS image_source TEXT DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.points_of_interest.image_source IS 'Source of the image: google_places, pixabay, or manual';