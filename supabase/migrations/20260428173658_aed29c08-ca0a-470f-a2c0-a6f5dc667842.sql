-- Tighten catalogs storage write policies to admins only
DROP POLICY IF EXISTS "Admin upload catalogs" ON storage.objects;
DROP POLICY IF EXISTS "Admin update catalogs" ON storage.objects;
DROP POLICY IF EXISTS "Admin delete catalogs" ON storage.objects;

CREATE POLICY "Admins can upload catalogs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'catalogs' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update catalogs"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'catalogs' AND public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (bucket_id = 'catalogs' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can delete catalogs"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'catalogs' AND public.has_role(auth.uid(), 'admin'::public.app_role));

-- Remove public read exposure from scraped prospect archive
DROP POLICY IF EXISTS "Anyone can read scraper leads" ON public.scraper_leads_archive_2026;
DROP POLICY IF EXISTS "Admins can read scraper leads archive" ON public.scraper_leads_archive_2026;
DROP POLICY IF EXISTS "Admins can manage scraper leads archive" ON public.scraper_leads_archive_2026;

CREATE POLICY "Admins can read scraper leads archive"
ON public.scraper_leads_archive_2026
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can manage scraper leads archive"
ON public.scraper_leads_archive_2026
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));