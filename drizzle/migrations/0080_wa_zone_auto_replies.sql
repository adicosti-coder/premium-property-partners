CREATE TABLE public.wa_zone_auto_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone text NOT NULL DEFAULT '*',
  intent text NOT NULL CHECK (intent IN ('vanzare','clasic','hotelier')),
  message text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (zone, intent)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wa_zone_auto_replies TO authenticated;
GRANT ALL ON public.wa_zone_auto_replies TO service_role;
ALTER TABLE public.wa_zone_auto_replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage zone auto replies" ON public.wa_zone_auto_replies
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));