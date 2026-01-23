
-- Update check constraint to include services category
ALTER TABLE public.points_of_interest DROP CONSTRAINT IF EXISTS points_of_interest_category_check;

ALTER TABLE public.points_of_interest ADD CONSTRAINT points_of_interest_category_check 
CHECK (category IN ('restaurant', 'cafe', 'bar', 'shopping', 'attraction', 'transport', 'entertainment', 'health', 'sports', 'services'));
