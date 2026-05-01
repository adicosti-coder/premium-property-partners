
-- Remove the policy that re-exposed guest_email
DROP POLICY IF EXISTS "Public can read published reviews" ON public.property_reviews;

-- Drop view (will recreate)
DROP VIEW IF EXISTS public.property_reviews_public;

-- Use SECURITY DEFINER function to safely expose only non-PII columns
CREATE OR REPLACE FUNCTION public.get_public_property_reviews(p_property_id uuid DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  property_id uuid,
  booking_id uuid,
  guest_name text,
  rating integer,
  title text,
  content text,
  is_published boolean,
  created_at timestamptz,
  updated_at timestamptz,
  admin_reply text,
  admin_reply_at timestamptz,
  source text,
  booking_review_id text,
  review_date date,
  guest_country text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id, property_id, booking_id, guest_name, rating, title, content,
    is_published, created_at, updated_at, admin_reply, admin_reply_at,
    source, booking_review_id, review_date, guest_country
  FROM public.property_reviews
  WHERE is_published = true
    AND (p_property_id IS NULL OR property_id = p_property_id);
$$;

GRANT EXECUTE ON FUNCTION public.get_public_property_reviews(uuid) TO anon, authenticated;
