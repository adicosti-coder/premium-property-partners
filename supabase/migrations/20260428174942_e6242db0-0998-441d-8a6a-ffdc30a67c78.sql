-- Remove broad object-listing policies for public buckets while preserving direct public asset delivery via public bucket URLs
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Blog images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Cover images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Property images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Public can view hero videos" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for catalogs" ON storage.objects;

-- Catalog file enumeration remains admin-only for the admin UI
CREATE POLICY "Admins can list catalog files"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'catalogs' AND public.has_role(auth.uid(), 'admin'::public.app_role));

-- Explicitly revoke all overloads from public roles, then grant back only the app-required access
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM authenticated;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_profile(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_shared_poi_link(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auto_blacklist_prospect(uuid, integer, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bulk_archive_detected_agencies() TO authenticated;

-- Non-security-definer helper functions that are safe and used by policies/triggers can stay available to authenticated users if called indirectly
GRANT EXECUTE ON FUNCTION public.anonymize_ip_address(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.normalize_ro_phone(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.extract_url_domain(text) TO authenticated;