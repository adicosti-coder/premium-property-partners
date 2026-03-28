
-- Allow admins to delete from image_caption_cache
CREATE POLICY "Admins can delete image_caption_cache"
ON public.image_caption_cache
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to delete from translation_cache
CREATE POLICY "Admins can delete translation_cache"
ON public.translation_cache
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to delete from rewrite_cache
CREATE POLICY "Admins can delete rewrite_cache"
ON public.rewrite_cache
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
