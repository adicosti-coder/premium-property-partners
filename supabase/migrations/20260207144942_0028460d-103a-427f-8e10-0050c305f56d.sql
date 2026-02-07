-- Add investment-related columns to properties table
ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS listing_type text DEFAULT 'cazare' CHECK (listing_type IN ('cazare', 'vanzare', 'inchiriere', 'investitie')),
ADD COLUMN IF NOT EXISTS capital_necesar numeric DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.properties.listing_type IS 'Property listing type: cazare (short-term rental), vanzare (sale), inchiriere (long-term rent), investitie (investment opportunity)';
COMMENT ON COLUMN public.properties.capital_necesar IS 'Required capital/purchase price for investment properties in EUR';