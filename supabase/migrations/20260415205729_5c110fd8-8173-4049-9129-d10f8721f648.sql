
CREATE TABLE public.property_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  property_type TEXT,
  budget_range TEXT,
  bedrooms TEXT,
  preferred_area TEXT,
  message TEXT,
  source_page TEXT,
  source_property_slug TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.property_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit property requests"
  ON public.property_requests FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Admins can view all property requests"
  ON public.property_requests FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update property requests"
  ON public.property_requests FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete property requests"
  ON public.property_requests FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
