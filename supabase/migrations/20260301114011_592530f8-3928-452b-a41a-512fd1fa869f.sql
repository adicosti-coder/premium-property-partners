
ALTER TABLE public.property_reviews 
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS booking_review_id text,
  ADD COLUMN IF NOT EXISTS review_date date,
  ADD COLUMN IF NOT EXISTS guest_country text;

-- Unique constraint to prevent duplicate scraped reviews
CREATE UNIQUE INDEX IF NOT EXISTS idx_property_reviews_booking_unique 
  ON public.property_reviews (property_id, booking_review_id) 
  WHERE booking_review_id IS NOT NULL;
