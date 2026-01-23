-- Allow anyone to submit reviews (they will be unpublished by default)
CREATE POLICY "Anyone can submit reviews"
ON public.property_reviews
FOR INSERT
WITH CHECK (is_published = false);