-- Create a table for residential complexes
CREATE TABLE public.residential_complexes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  description_ro TEXT NOT NULL,
  description_en TEXT NOT NULL,
  property_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create a table for complex images
CREATE TABLE public.complex_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  complex_id UUID NOT NULL REFERENCES public.residential_complexes(id) ON DELETE CASCADE,
  image_path TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.residential_complexes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complex_images ENABLE ROW LEVEL SECURITY;

-- Public can view active complexes
CREATE POLICY "Complexes are publicly readable"
ON public.residential_complexes
FOR SELECT
USING (is_active = true);

-- Admins can manage complexes
CREATE POLICY "Admins can manage complexes"
ON public.residential_complexes
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Complex images are publicly readable
CREATE POLICY "Complex images are publicly readable"
ON public.complex_images
FOR SELECT
USING (true);

-- Admins can manage complex images
CREATE POLICY "Admins can manage complex images"
ON public.complex_images
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_residential_complexes_updated_at
BEFORE UPDATE ON public.residential_complexes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();