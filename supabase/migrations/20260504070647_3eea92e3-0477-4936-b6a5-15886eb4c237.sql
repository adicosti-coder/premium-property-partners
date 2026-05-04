
-- Drop public/anon SELECT policies that expose all columns
DROP POLICY IF EXISTS "Public can view approved listings" ON public.property_listings;
DROP POLICY IF EXISTS "Authenticated can view approved listings" ON public.property_listings;

-- Create a safe public view excluding internal/admin columns
CREATE OR REPLACE VIEW public.property_listings_public
WITH (security_invoker = true) AS
SELECT
  id,
  user_id,
  title,
  description,
  property_type,
  listing_category,
  location,
  size,
  rooms,
  bathrooms,
  price,
  images,
  status,
  created_at,
  updated_at,
  estimated_monthly_revenue,
  annual_operating_costs,
  initial_setup_cost,
  roi_percentage,
  investment_score,
  tags
FROM public.property_listings
WHERE status = 'approved'::listing_status;

GRANT SELECT ON public.property_listings_public TO anon, authenticated;

-- Re-add a safe SELECT policy on the base table only for approved rows,
-- but restrict columns at the application/view layer. To enforce that the
-- public-facing path hides admin_notes/ai_analysis/reviewed_by/reviewed_at,
-- we do NOT recreate broad public SELECT policies. Owners and admins keep
-- their existing policies ("Users can view own listings", "Admins can manage all listings").
