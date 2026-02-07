-- Add a short, human-readable property code for easy reference
ALTER TABLE public.properties 
ADD COLUMN property_code TEXT UNIQUE;

-- Create index for fast lookups by property_code
CREATE INDEX idx_properties_property_code ON public.properties(property_code);

-- Generate initial codes for existing properties (RT-001, RT-002, etc.)
WITH numbered_properties AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn
  FROM public.properties
)
UPDATE public.properties p
SET property_code = 'RT-' || LPAD(np.rn::text, 3, '0')
FROM numbered_properties np
WHERE p.id = np.id;

-- Create a function to auto-generate property codes for new properties
CREATE OR REPLACE FUNCTION public.generate_property_code()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  IF NEW.property_code IS NULL THEN
    SELECT COALESCE(MAX(SUBSTRING(property_code FROM 4)::INTEGER), 0) + 1
    INTO next_num
    FROM public.properties
    WHERE property_code ~ '^RT-[0-9]+$';
    
    NEW.property_code := 'RT-' || LPAD(next_num::text, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger to auto-generate codes
CREATE TRIGGER trg_generate_property_code
BEFORE INSERT ON public.properties
FOR EACH ROW
EXECUTE FUNCTION public.generate_property_code();