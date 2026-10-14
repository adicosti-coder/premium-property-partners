DROP POLICY IF EXISTS "Admins upload social reels" ON storage.objects;
CREATE POLICY "Admins upload social reels" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'social-reels' AND public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins read social reels" ON storage.objects;
CREATE POLICY "Admins read social reels" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'social-reels' AND public.has_role(auth.uid(), 'admin'));