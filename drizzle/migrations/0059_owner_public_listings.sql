CREATE TABLE public.owner_public_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_listing_id uuid REFERENCES public.prospect_listings(id) ON DELETE SET NULL,
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  price numeric,
  currency text DEFAULT 'EUR',
  zone text,
  rooms integer,
  size numeric,
  property_type text,
  transaction_type text,
  image_url text,
  source_url text,
  source_platform text,
  is_published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  unpublished_at timestamptz,
  consent_id uuid REFERENCES public.wa_publish_consents(id) ON DELETE SET NULL,
  consent_proof text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_owner_public_listings_published ON public.owner_public_listings (is_published, published_at DESC);
CREATE INDEX idx_owner_public_listings_prospect ON public.owner_public_listings (prospect_listing_id);

GRANT SELECT ON public.owner_public_listings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.owner_public_listings TO authenticated;
GRANT ALL ON public.owner_public_listings TO service_role;

ALTER TABLE public.owner_public_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read published owner listings"
ON public.owner_public_listings FOR SELECT
TO anon, authenticated
USING (is_published = true);

CREATE POLICY "Admins can read all owner listings"
ON public.owner_public_listings FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert owner listings"
ON public.owner_public_listings FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update owner listings"
ON public.owner_public_listings FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete owner listings"
ON public.owner_public_listings FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_owner_public_listings_updated_at
BEFORE UPDATE ON public.owner_public_listings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();