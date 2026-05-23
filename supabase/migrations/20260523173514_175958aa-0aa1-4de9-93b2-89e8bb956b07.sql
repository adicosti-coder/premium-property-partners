-- Add image processing tracking columns to properties
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS images_processing_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS images_processing_log JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS images_processed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_properties_images_processing_status
  ON public.properties(images_processing_status)
  WHERE images_processing_status IN ('pending', 'processing', 'failed');

-- Create public bucket for cleaned property images
INSERT INTO storage.buckets (id, name, public)
VALUES ('property-images', 'property-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- RLS: public read, only service-role / admins write
DROP POLICY IF EXISTS "property-images public read" ON storage.objects;
CREATE POLICY "property-images public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'property-images');

DROP POLICY IF EXISTS "property-images admin write" ON storage.objects;
CREATE POLICY "property-images admin write"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'property-images'
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  );

DROP POLICY IF EXISTS "property-images admin update" ON storage.objects;
CREATE POLICY "property-images admin update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'property-images'
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  );

DROP POLICY IF EXISTS "property-images admin delete" ON storage.objects;
CREATE POLICY "property-images admin delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'property-images'
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  );
