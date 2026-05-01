-- Remove broad owner SELECT policy that exposed guest_email, and replace with a SECURITY DEFINER RPC
-- that returns only non-sensitive review fields to property owners.

DROP POLICY IF EXISTS "Owners can view reviews for their properties" ON public.property_reviews;

CREATE OR REPLACE FUNCTION public.get_owner_property_reviews(p_property_id uuid DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  property_id uuid,
  booking_id uuid,
  guest_name text,
  rating integer,
  title text,
  content text,
  is_published boolean,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  admin_reply text,
  admin_reply_at timestamp with time zone,
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
    pr.id, pr.property_id, pr.booking_id, pr.guest_name, pr.rating, pr.title, pr.content,
    pr.is_published, pr.created_at, pr.updated_at, pr.admin_reply, pr.admin_reply_at,
    pr.source, pr.booking_review_id, pr.review_date, pr.guest_country
  FROM public.property_reviews pr
  WHERE auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.owner_properties op
      WHERE op.property_id = pr.property_id
        AND op.user_id = auth.uid()
    )
    AND (p_property_id IS NULL OR pr.property_id = p_property_id);
$$;

REVOKE EXECUTE ON FUNCTION public.get_owner_property_reviews(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_owner_property_reviews(uuid) TO authenticated;