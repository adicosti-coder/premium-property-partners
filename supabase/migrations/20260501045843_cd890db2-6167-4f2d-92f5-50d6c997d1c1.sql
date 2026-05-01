
-- 1. Properties: drop trigger + columns
DROP TRIGGER IF EXISTS sync_property_contact_details_before_save ON public.properties;
DROP FUNCTION IF EXISTS public.sync_property_contact_details() CASCADE;

ALTER TABLE public.properties DROP COLUMN IF EXISTS contact_name CASCADE;
ALTER TABLE public.properties DROP COLUMN IF EXISTS contact_phone CASCADE;
ALTER TABLE public.properties DROP COLUMN IF EXISTS contact_email CASCADE;

-- 2. property_reviews: hide guest_email from public via view + restrict base table SELECT
DROP POLICY IF EXISTS "Published reviews are publicly readable" ON public.property_reviews;

-- Restrict direct SELECT on base table: admin or owner only
CREATE POLICY "Admin can read all reviews"
  ON public.property_reviews FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Owners policy already exists; create view for public access
CREATE OR REPLACE VIEW public.property_reviews_public
WITH (security_invoker = off) AS
SELECT 
  id, property_id, booking_id, guest_name, rating, title, content,
  is_published, created_at, updated_at, admin_reply, admin_reply_at,
  source, booking_review_id, review_date, guest_country
FROM public.property_reviews
WHERE is_published = true;

GRANT SELECT ON public.property_reviews_public TO anon, authenticated;
