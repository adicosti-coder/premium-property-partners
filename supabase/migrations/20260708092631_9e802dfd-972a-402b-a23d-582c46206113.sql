
-- 1) Drop the broken owner bookings policy (integer::text::uuid cast can never match).
--    Admins still have full access via the existing admin policy. A correct owner
--    policy can be reintroduced once bookings.property_id is aligned with a uuid FK.
DROP POLICY IF EXISTS "Owners can view their property bookings" ON public.bookings;

-- 2) Hide scraped-source / import provenance columns on public.properties from the
--    public Data API. Public reads remain allowed on all other columns via the
--    existing "Properties are publicly readable" policy; admins and edge functions
--    keep full access through admin role / service_role.
REVOKE SELECT (
  original_source_url,
  original_description_raw,
  import_source,
  source_url,
  source_platform,
  sanitization_log,
  migrated_from_prospect_id
) ON public.properties FROM anon, authenticated;

-- Ensure service_role and admin-side code retain full column access.
GRANT SELECT ON public.properties TO service_role;
