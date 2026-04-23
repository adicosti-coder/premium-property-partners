-- Singleton settings table for the agency-detection algorithm.
CREATE TABLE IF NOT EXISTS public.agency_detection_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  suspicion_threshold integer NOT NULL DEFAULT 70 CHECK (suspicion_threshold BETWEEN 0 AND 100),
  multi_listing_threshold integer NOT NULL DEFAULT 3 CHECK (multi_listing_threshold BETWEEN 2 AND 50),
  multi_listing_window_days integer NOT NULL DEFAULT 14 CHECK (multi_listing_window_days BETWEEN 1 AND 90),
  enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

INSERT INTO public.agency_detection_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.agency_detection_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read detection settings"
  ON public.agency_detection_settings FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update detection settings"
  ON public.agency_detection_settings FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Dynamic keyword library, editable from the UI.
CREATE TYPE public.agency_keyword_type AS ENUM ('hard', 'soft', 'owner');

CREATE TABLE IF NOT EXISTS public.agency_keywords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword text NOT NULL,
  type public.agency_keyword_type NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  UNIQUE (type, keyword)
);

CREATE INDEX IF NOT EXISTS idx_agency_keywords_type_enabled
  ON public.agency_keywords(type) WHERE enabled = true;

ALTER TABLE public.agency_keywords ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage agency keywords"
  ON public.agency_keywords FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Allow read-only access to authenticated users (so ProspectListings query
-- inside the admin UI can fetch them without service role).
CREATE POLICY "Authenticated can read agency keywords"
  ON public.agency_keywords FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can read detection settings"
  ON public.agency_detection_settings FOR SELECT
  TO authenticated
  USING (true);
