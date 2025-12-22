-- Create properties table with bilingual support
CREATE TABLE public.properties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  description_ro TEXT NOT NULL,
  description_en TEXT NOT NULL,
  features TEXT[] NOT NULL DEFAULT '{}',
  booking_url TEXT NOT NULL,
  tag TEXT NOT NULL,
  image_path TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access (properties are public information)
CREATE POLICY "Properties are publicly readable" 
ON public.properties 
FOR SELECT 
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_properties_updated_at
BEFORE UPDATE ON public.properties
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();