
INSERT INTO storage.buckets (id, name, public)
VALUES ('catalogs', 'catalogs', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read access for catalogs" ON storage.objects
FOR SELECT TO anon, authenticated
USING (bucket_id = 'catalogs');

CREATE POLICY "Admin upload catalogs" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'catalogs');

CREATE POLICY "Admin update catalogs" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'catalogs');

CREATE POLICY "Admin delete catalogs" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'catalogs');
