
DROP VIEW IF EXISTS public.property_reviews_public;

CREATE VIEW public.property_reviews_public
WITH (security_invoker = on) AS
SELECT 
  id, property_id, booking_id, guest_name, rating, title, content,
  is_published, created_at, updated_at, admin_reply, admin_reply_at,
  source, booking_review_id, review_date, guest_country
FROM public.property_reviews
WHERE is_published = true;

-- Allow public/auth to read via view; base table SELECT requires admin/owner
-- Need an additional policy on base table so view can read published rows
DROP POLICY IF EXISTS "Public can read published reviews via view" ON public.property_reviews;
CREATE POLICY "Public can read published reviews"
  ON public.property_reviews FOR SELECT
  TO anon, authenticated
  USING (is_published = true);

GRANT SELECT ON public.property_reviews_public TO anon, authenticated;
