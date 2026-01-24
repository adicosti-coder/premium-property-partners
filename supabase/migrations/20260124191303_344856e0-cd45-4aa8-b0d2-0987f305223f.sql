-- Add column to track when image fetch failed for a POI
ALTER TABLE public.points_of_interest 
ADD COLUMN image_fetch_failed boolean NOT NULL DEFAULT false;

-- Add column to track last fetch attempt timestamp
ALTER TABLE public.points_of_interest 
ADD COLUMN image_fetch_attempted_at timestamp with time zone;

-- Add comment for clarity
COMMENT ON COLUMN public.points_of_interest.image_fetch_failed IS 'True if Google Places could not find an image for this POI';
COMMENT ON COLUMN public.points_of_interest.image_fetch_attempted_at IS 'Timestamp of last image fetch attempt';