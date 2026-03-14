
CREATE TABLE public.guest_guides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id text UNIQUE NOT NULL,
  property_name text NOT NULL,
  property_image text,
  check_in_date date NOT NULL,
  check_out_date date NOT NULL,
  check_in_time text DEFAULT '15:00',
  check_out_time text DEFAULT '11:00',
  pin_code text,
  wifi_name text,
  wifi_password text,
  access_instructions text,
  access_video_url text,
  parking_instructions text,
  parking_gps_lat numeric,
  parking_gps_lng numeric,
  whatsapp_number text DEFAULT '+40770635252',
  additional_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.guest_guides ENABLE ROW LEVEL SECURITY;

-- Public read access by booking_id (no auth required - guests access via unique link)
CREATE POLICY "Anyone can read guest guide by booking_id"
  ON public.guest_guides FOR SELECT
  USING (true);

-- Only admins can insert/update/delete
CREATE POLICY "Admins can manage guest guides"
  ON public.guest_guides FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
