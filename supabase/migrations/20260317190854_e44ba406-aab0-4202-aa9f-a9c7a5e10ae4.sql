-- Add is_published column to property_images for draft/published workflow
ALTER TABLE public.property_images 
ADD COLUMN is_published boolean NOT NULL DEFAULT true;

-- Add index for efficient filtering
CREATE INDEX idx_property_images_published ON public.property_images (property_id, is_published);

-- Add original_url column to store the original source URL before any processing
ALTER TABLE public.property_images 
ADD COLUMN original_url text;