
-- Add booking rating fields to properties
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS booking_rating numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS booking_review_count integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS base_price_per_night numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS weekend_price_per_night numeric DEFAULT NULL;

-- Create property_pricing table for seasonal/dynamic pricing
CREATE TABLE public.property_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  label text NOT NULL,
  price_per_night numeric NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.property_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage property pricing"
  ON public.property_pricing FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Property pricing is publicly readable"
  ON public.property_pricing FOR SELECT
  USING (is_active = true);
