
-- Change rating column from integer to numeric to support decimal ratings like 9.5, 9.7
ALTER TABLE public.property_reviews 
ALTER COLUMN rating TYPE numeric USING rating::numeric;
