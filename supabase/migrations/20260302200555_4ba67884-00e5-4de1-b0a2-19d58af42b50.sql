-- Remove old check constraint (rating <= 5) and add new one (rating <= 10)
ALTER TABLE public.property_reviews DROP CONSTRAINT IF EXISTS property_reviews_rating_check;
ALTER TABLE public.property_reviews ADD CONSTRAINT property_reviews_rating_check CHECK (rating >= 1 AND rating <= 10);

-- Fix existing reviews: convert 5-scale back to 10-scale
UPDATE public.property_reviews SET rating = rating * 2 WHERE source = 'booking.com' AND rating <= 5;