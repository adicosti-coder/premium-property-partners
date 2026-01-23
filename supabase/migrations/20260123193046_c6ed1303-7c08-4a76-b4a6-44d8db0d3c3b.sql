-- Create storage bucket for community article cover images
INSERT INTO storage.buckets (id, name, public)
VALUES ('community-articles', 'community-articles', true);

-- Allow authenticated users to upload their own cover images
CREATE POLICY "Users can upload their own cover images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'community-articles' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow anyone to view cover images (public bucket)
CREATE POLICY "Cover images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'community-articles');

-- Allow users to update their own cover images
CREATE POLICY "Users can update their own cover images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'community-articles' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own cover images
CREATE POLICY "Users can delete their own cover images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'community-articles' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);