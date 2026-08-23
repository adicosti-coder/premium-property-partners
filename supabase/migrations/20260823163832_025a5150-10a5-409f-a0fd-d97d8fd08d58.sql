-- 1) blog_ai_snapshots: add restrictive admin-only SELECT layer (fail-closed even if a permissive policy is added later)
CREATE POLICY "restrict_select_admin_only"
ON public.blog_ai_snapshots
AS RESTRICTIVE
FOR SELECT
TO anon, authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 2) AI caches: remove public read, restrict to admins (edge functions use service_role)
DROP POLICY IF EXISTS "Allow public read rewrite_cache" ON public.rewrite_cache;
DROP POLICY IF EXISTS "Allow public read translation_cache" ON public.translation_cache;

CREATE POLICY "Admins can read rewrite_cache"
ON public.rewrite_cache
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can read translation_cache"
ON public.translation_cache
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

REVOKE SELECT ON public.rewrite_cache FROM anon;
REVOKE SELECT ON public.translation_cache FROM anon;

-- 3) maintenance-files storage: ownership by exact property-id folder prefix, no LIKE wildcards
DROP POLICY IF EXISTS "Owners can view their property maintenance files" ON storage.objects;

CREATE POLICY "Owners can view their property maintenance files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'maintenance-files'
  AND (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
  AND EXISTS (
    SELECT 1 FROM public.owner_properties op
    WHERE op.user_id = auth.uid()
      AND op.property_id = ((storage.foldername(name))[1])::uuid
  )
);