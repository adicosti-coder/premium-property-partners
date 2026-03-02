ALTER TABLE public.property_reviews 
ADD CONSTRAINT property_reviews_property_id_booking_review_id_unique 
UNIQUE (property_id, booking_review_id);