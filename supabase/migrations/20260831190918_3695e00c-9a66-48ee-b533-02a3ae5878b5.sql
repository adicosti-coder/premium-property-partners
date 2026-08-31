CREATE TABLE public.booking_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reference text NOT NULL UNIQUE,
  property_slug text,
  property_name text NOT NULL,
  property_ref_id integer,
  guest_name text NOT NULL,
  guest_email text NOT NULL,
  guest_phone text NOT NULL,
  country text,
  guests integer NOT NULL DEFAULT 1,
  check_in date NOT NULL,
  check_out date NOT NULL,
  nights integer NOT NULL DEFAULT 1,
  message text,
  discount_code text,
  estimated_total numeric,
  status text NOT NULL DEFAULT 'pending',
  source text NOT NULL DEFAULT 'property_detail',
  utm jsonb,
  admin_email_sent boolean NOT NULL DEFAULT false,
  guest_email_sent boolean NOT NULL DEFAULT false,
  notified_at timestamptz,
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT booking_requests_dates_valid CHECK (check_out > check_in),
  CONSTRAINT booking_requests_status_valid CHECK (status IN ('pending','contacted','confirmed','declined','cancelled'))
);

CREATE INDEX booking_requests_created_at_idx ON public.booking_requests (created_at DESC);
CREATE INDEX booking_requests_status_idx ON public.booking_requests (status);
CREATE INDEX booking_requests_property_slug_idx ON public.booking_requests (property_slug);

-- Guest PII: only admins may read/manage; public writes go through the
-- submit-booking-request edge function (service role).
GRANT SELECT, UPDATE ON public.booking_requests TO authenticated;
GRANT ALL ON public.booking_requests TO service_role;

ALTER TABLE public.booking_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view booking requests"
ON public.booking_requests FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can update booking requests"
ON public.booking_requests FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER booking_requests_touch_updated_at
BEFORE UPDATE ON public.booking_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();