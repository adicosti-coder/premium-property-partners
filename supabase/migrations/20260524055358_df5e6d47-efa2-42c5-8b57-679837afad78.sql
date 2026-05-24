CREATE TABLE IF NOT EXISTS public.pm_scan_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true UNIQUE,
  min_rating_airbnb numeric NOT NULL DEFAULT 4.5,
  min_rating_booking numeric NOT NULL DEFAULT 8.5,
  price_min numeric NOT NULL DEFAULT 35,
  price_max numeric NOT NULL DEFAULT 200,
  priority_zones text[] NOT NULL DEFAULT ARRAY['ISHO','Paltim','City of Mara','Fructus Plaza','Cetate/Unirii']::text[],
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pm_scan_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage pm_scan_settings"
ON public.pm_scan_settings
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_pm_scan_settings_updated
BEFORE UPDATE ON public.pm_scan_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.pm_scan_settings (singleton) VALUES (true)
ON CONFLICT (singleton) DO NOTHING;