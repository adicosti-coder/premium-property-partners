-- Create listing status enum
CREATE TYPE public.listing_status AS ENUM ('pending_inspection', 'approved', 'rejected');

-- Create listing category enum
CREATE TYPE public.listing_category AS ENUM ('vanzare', 'inchiriere', 'regim_hotelier');

-- Create property listings table
CREATE TABLE public.property_listings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  property_type TEXT NOT NULL DEFAULT 'apartament',
  listing_category listing_category NOT NULL DEFAULT 'inchiriere',
  location TEXT,
  size NUMERIC,
  rooms INTEGER,
  bathrooms INTEGER,
  price NUMERIC,
  images TEXT[] DEFAULT '{}',
  ai_analysis JSONB,
  status listing_status NOT NULL DEFAULT 'pending_inspection',
  admin_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.property_listings ENABLE ROW LEVEL SECURITY;

-- Users can view their own listings
CREATE POLICY "Users can view own listings"
ON public.property_listings FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can create listings
CREATE POLICY "Users can create listings"
ON public.property_listings FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update their own pending listings
CREATE POLICY "Users can update own pending listings"
ON public.property_listings FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND status = 'pending_inspection')
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own pending listings
CREATE POLICY "Users can delete own pending listings"
ON public.property_listings FOR DELETE
TO authenticated
USING (auth.uid() = user_id AND status = 'pending_inspection');

-- Admins can manage all listings
CREATE POLICY "Admins can manage all listings"
ON public.property_listings FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Public can view approved listings
CREATE POLICY "Public can view approved listings"
ON public.property_listings FOR SELECT
TO anon
USING (status = 'approved');

-- Authenticated users can view approved listings from others
CREATE POLICY "Authenticated can view approved listings"
ON public.property_listings FOR SELECT
TO authenticated
USING (status = 'approved');

-- Trigger for updated_at
CREATE TRIGGER update_property_listings_updated_at
BEFORE UPDATE ON public.property_listings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();