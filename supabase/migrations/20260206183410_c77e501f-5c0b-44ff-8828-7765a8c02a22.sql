-- Fix complex_images RLS: Only allow access to images of active complexes
-- Drop the overly permissive public read policy
DROP POLICY IF EXISTS "Complex images are publicly readable" ON public.complex_images;

-- Create a more restrictive policy that checks if the parent complex is active
CREATE POLICY "Complex images are publicly readable for active complexes"
ON public.complex_images
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.residential_complexes rc
    WHERE rc.id = complex_images.complex_id
    AND rc.is_active = true
  )
);