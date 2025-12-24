-- Create property_images table for multiple images per property
CREATE TABLE public.property_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  image_path TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.property_images ENABLE ROW LEVEL SECURITY;

-- Public can view images
CREATE POLICY "Property images are publicly readable"
ON public.property_images
FOR SELECT
USING (true);

-- Admins can manage images
CREATE POLICY "Admins can insert property images"
ON public.property_images
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update property images"
ON public.property_images
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete property images"
ON public.property_images
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster lookups
CREATE INDEX idx_property_images_property_id ON public.property_images(property_id);
CREATE INDEX idx_property_images_display_order ON public.property_images(property_id, display_order);