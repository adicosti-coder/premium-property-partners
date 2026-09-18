CREATE TABLE IF NOT EXISTS public.wa_publish_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_normalized text NOT NULL,
  prospect_listing_id uuid REFERENCES public.prospect_listings(id) ON DELETE SET NULL,
  property_id uuid,
  status text NOT NULL DEFAULT 'requested',
  consent_text text,
  requested_at timestamptz,
  consented_at timestamptz,
  revoked_at timestamptz,
  published_at timestamptz,
  source text NOT NULL DEFAULT 'whatsapp',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS wa_publish_consents_phone_prospect_uniq
  ON public.wa_publish_consents (phone_normalized, prospect_listing_id) NULLS NOT DISTINCT;

CREATE INDEX IF NOT EXISTS wa_publish_consents_status_idx
  ON public.wa_publish_consents (status, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.wa_publish_consents TO authenticated;
GRANT ALL ON public.wa_publish_consents TO service_role;

ALTER TABLE public.wa_publish_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage publish consents"
ON public.wa_publish_consents
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE OR REPLACE FUNCTION public.wa_publish_consents_touch()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS wa_publish_consents_touch_trg ON public.wa_publish_consents;
CREATE TRIGGER wa_publish_consents_touch_trg
BEFORE UPDATE ON public.wa_publish_consents
FOR EACH ROW EXECUTE FUNCTION public.wa_publish_consents_touch();