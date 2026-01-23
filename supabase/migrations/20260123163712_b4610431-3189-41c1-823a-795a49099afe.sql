-- Add premium flag to POIs
ALTER TABLE public.points_of_interest 
ADD COLUMN is_premium boolean NOT NULL DEFAULT false;

-- Drop existing public SELECT policy
DROP POLICY IF EXISTS "POIs are publicly readable" ON public.points_of_interest;

-- Create new policy: Everyone can see non-premium active POIs
CREATE POLICY "Anyone can view basic POIs"
ON public.points_of_interest
FOR SELECT
USING (is_active = true AND is_premium = false);

-- Create policy: Authenticated users can view all active POIs (including premium)
CREATE POLICY "Authenticated users can view all POIs"
ON public.points_of_interest
FOR SELECT
TO authenticated
USING (is_active = true);

-- Mark some POIs as premium (best restaurants, cafes, hidden gems)
UPDATE public.points_of_interest 
SET is_premium = true 
WHERE name IN (
  'Craft',
  'Scârț Loc Lejer', 
  'D''Arc Coffee',
  'Manufactura',
  'Casa Bunicii'
);

-- Add comment explaining the system
COMMENT ON COLUMN public.points_of_interest.is_premium IS 'Premium POIs are only visible to authenticated users';